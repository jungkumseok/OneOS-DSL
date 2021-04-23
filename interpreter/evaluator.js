const Spawner = require("./Spawner.js");
const path = require("path");

function Node(script, args, attrs) {
    this.script = script;
    this.args = args;
    this.attrs = attrs;
    this.in_edges = [];
    this.out_edges = [];
    this.pid = null;
}

function Edge(sender, receiver, pipe) {
    this.sender = sender;
    this.receiver = receiver;
    this.pipe = pipe;
    this.graphs = []; // Graphs the edge is a part of
}

function Graph(name) {
    this.name = name;
    this.nodes = new Set();
    this.edges = [];
}

// TODO: move these to the environment?

function is_node_group(env, name) {
    return env.NodeGroups[name] != undefined;
}

function is_graph(env, name) {
    return env.Graphs[name] != undefined;
}

function is_piping_op(exp) {
    var piping_ops = " -> -*> ~> ~/> ~*> ";
    return exp.type == "op" && piping_ops.includes(" " + exp.operator + " ");
}

function get_edge(sender, receiver) {
    for (var edge of sender.out_edges) {
        if (edge.receiver == receiver) {
            return edge;
        }
    }
    return null;
}

function spawn_node_group(env, name) {
    // Spawn each node that has not been spawned
    for (var nd of env.NodeGroups[name]) {
        if (nd.pid == null) {
            env.spawnQueue.add(nd);
        }
    }
}

function spawn_graph(env, name) {
    // Spawn each node that has not been spawned
    for (var nd of env.Graphs[name].nodes) {
        if (nd.pid == null) {
            env.spawnQueue.add(nd);
        }
    }
}

function add_node_to_group(env, name, nd) {
    if (env.NodeGroups[name] == undefined) {
        env.NodeGroups[name] = [];
    }
    env.NodeGroups[name].push(nd);
}

function get_node_group(env, name) {
    var group = env.NodeGroups[name];
    if (group == undefined) {
        throw new Error(`No node group named \"${name}\"`);
    }
    return group;
}

function verify_node_arg(env, cmd, first_arg) {
    var arg_val = first_arg.value;
    if (first_arg.type == "num") {
        throw new Error(
            `Invalid first argument \"${arg_val}\": \"${cmd}\" command needs a *.js or *.py file as the first argument`
        );
    }

    var file_types = " .js  .py ";
    if (file_types.indexOf(arg_val.substr(arg_val.length - 3)) < 0) {
        throw new Error(
            `Invalid file \"${arg_val}\": \"${cmd}\" command needs a *.js or *.py file as the first argument`
        );
    } else {
        // Check the file exists
        env.verifs.push(env.api.fileExists(path.resolve(env.cwd, arg_val)));
    }
}

function get_args(args_arr) {
    // TODO: parse command options (e.g. --help or -h)?
    return args_arr.map((arg) => arg.value);
}

function create_node(env, exp, spawn) {
    var first_arg = exp.args[0];
    verify_node_arg(env, cmd, first_arg);

    var file_name = first_arg.value;
    var args = get_args(exp.args.slice(1));
    var nd = new Node(file_name, args, exp.attrs);

    if (exp.group) {
        add_node_to_group(env, exp.group, nd);
    } else if (spawn == false && !env.curr_graph) {
        throw new Error(
            "A staged node must be assigned to a node group or be defined within a graph"
        );
    }

    if (spawn == true) {
        env.spawnQueue.add(nd);
    }

    return nd;
}

function get_nodes(env, nested_node_arr) {
    var node_arr = [];
    for (var i = 0; i < nested_node_arr.length; i++) {
        if (Array.isArray(nested_node_arr[i])) {
            node_arr = node_arr.concat(get_nodes(env, nested_node_arr[i]));
        } else {
            var node = nested_node_arr[i];
            if (typeof node == "string") {
                // Get the corresponding node group
                node_arr = node_arr.concat(get_node_group(env, node));
            } else {
                node_arr.push(node);
            }
        }
    }
    return node_arr;
}

function create_edges(env, senders, receivers, op) {
    if (!Array.isArray(senders)) senders = [senders];
    if (!Array.isArray(receivers)) receivers = [receivers];

    /* Note: senders and receivers arrays may contain nested arrays
    and names of node groups rather than the actual nodes */
    new_senders = get_nodes(env, senders);
    new_receivers = get_nodes(env, receivers);

    for (var sender of new_senders) {
        for (var receiver of new_receivers) {
            var edge = get_edge(sender, receiver);
            if (edge == null) {
                edge = new Edge(sender, receiver, op);
                sender.out_edges.push(edge);
                receiver.in_edges.push(edge);
            }
            edge.graphs.push(env.curr_graph.name);
            env.curr_graph.edges.push(edge); // TODO: may only need to have a set of nodes in graph since we're only spawning a graph right now
            env.curr_graph.nodes.add(sender);
            env.curr_graph.nodes.add(receiver);
        }
    }

    return new_receivers;
}

async function create_implicit_graph(op_exp, env) {
    var edges = [];
    var graph = new Graph(env.num_implicit_graphs);
    env.curr_graph = graph;
    edges.push(await apply_op(env, op_exp.operator, op_exp.left, op_exp.right));
    env.curr_graph = null;

    env.Graphs[env.num_implicit_graphs] = graph;
    spawn_graph(env, env.num_implicit_graphs++);

    return graph;
}

async function evaluate(exp, env) {
    switch (exp.type) {
        case "num":
        case "str":
        case "id":
            return exp.value;

        case "cmd":
            return await evaluate_cmd(exp, env);

        case "op":
            // A graph is implicitly created when a piping is used outside of the connect command edge list
            // e.g. 10 * (spawn map.js) -> 4 * (spawn reduce.js #camera) ~> spawn reduce.js log.txt
            if (is_piping_op(exp) && !env.curr_graph) {
                return await create_implicit_graph(exp, env);
            } else {
                return await apply_op(env, exp.operator, exp.left, exp.right);
            }

        case "list":
            var val = [];
            for (var exp of exp.elems) {
                val.push(await evaluate(exp, env));
            }
            return val;

        case "prog":
            var res = [];
            for (var exp of exp.prog) {
                res.push(await evaluate(exp, env));
                // console.log(res); // TODO: remove print after debugging
            }

            // Wait until async verifications resolve
            await Promise.all(env.verifs)
                .then(() => new Spawner(env).spawn_nodes(env.spawnQueue))
                .catch((err) => {
                    env.doneEval();
                    throw err;
                });
            env.doneEval();

            return res;

        default:
            throw new Error("I don't know how to evaluate " + exp.type);
    }
}

async function evaluate_cmd(exp, env) {
    var cmd = exp.cmd;
    switch (cmd) {
        case "node":
            return create_node(env, exp, false);

        case "spawn":
            // If first arg is a string, then we are spawning an existing node group or graph
            var first_arg = exp.args[0];
            if (first_arg.type == "str") {
                // Get the identifier
                if (is_node_group(env, first_arg.value)) {
                    spawn_node_group(env, first_arg.value);
                } else if (is_graph(env, first_arg.value)) {
                    spawn_graph(env, first_arg.value);
                } else {
                    throw new Error(
                        `\"${first_arg.value}\" does not correspond to a node group or graph`
                    );
                }
                return;
            } else {
                // We are spawning a new node
                return create_node(env, exp, true);
            }

        case "connect":
            /* Create a graph */
            var graph_name = exp.graph;
            if (is_graph(env, graph_name)) {
                throw new Error(`Graph \"${graph_name}\" already exists`);
            }

            var graph = new Graph(exp.graph);

            env.curr_graph = graph;
            await evaluate(exp.args[0], env);
            env.curr_graph = null;

            env.Graphs[graph_name] = graph;
            return graph;

        case "spawn_connect":
            // Can create an unamed graph (no, automatically assign a name) Graph1
            console.log("spawn_connect cmd not yet supported");
            return;

        default:
            return await env
                .get(exp.cmd)
                .then((res) => res(get_args(exp.args), env));
    }
}

async function apply_op(env, op, left_exp, right_exp) {
    function num(x) {
        if (typeof x != "number")
            throw new Error("Expected number but got " + x);
        return x;
    }
    switch (op) {
        case "*":
            var x = await evaluate(left_exp, env);
            var vals = [];
            for (var i = 0; i < num(x); i++) {
                vals.push(await evaluate(right_exp, env));
            }
            return vals;
        case "~>":
        case "->":
        case "-*>":
        case "~*>":
        case "~/>":
            var senders = await evaluate(left_exp, env);
            var receivers = await evaluate(right_exp, env);
            parsed_receivers = create_edges(env, senders, receivers, op);
            return parsed_receivers; // Return receivers so we can chain pipes
    }
    throw new Error("Can't apply operator " + op);
}

module.exports = evaluate;
