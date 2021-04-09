var InputStream = require("./input-stream.js");
var TokenStream = require("./token-stream.js");
var parse = require("./parser.js");
var Spawner = require("./spawner.js");

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

// Maps name to a graph
var Graphs = {};

// Maps name to a list of one or more nodes (staged or spawned)
var NodeGroups = {};

// Queue of nodes needing to be spawned
var spawnQueue = new Set();

var curr_graph = null;
var num_implicit_graphs = 0;

function is_node_group(name) {
    return NodeGroups[name] != undefined;
}

function is_graph(name) {
    return Graphs[name] != undefined;
}

function is_piping_op(exp) {
    var piping_ops = " * -> -*> ~> ~/> ~*> ";
    return exp.type == "op" && piping_ops.includes(exp.operator) >= 0;
}

function get_edge(sender, receiver) {
    for (var edge of sender.edges) {
        if (edge.receiver == receiver) {
            return edge;
        }
    }
    return null;
}

function spawn_node_group(name) {
    // Spawn each node that has not been spawned
    for (var nd of NodeGroups[name]) {
        if (nd.pid == null) {
            spawnQueue.add(nd);
        }
    }
}

function spawn_graph(name) {
    // Spawn each node that has not been spawned
    for (var nd of Graphs[name].nodes) {
        if (nd.pid == null) {
            spawnQueue.add(nd);
        }
    }
}

function add_node_to_group(name, nd) {
    if (NodeGroups[name] == undefined) {
        NodeGroups[name] = [];
    }
    NodeGroups[name].push(nd);
}

function get_node_group(name) {
    var group = NodeGroups[name];
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
        console.log(env.cwd + "/" + arg_val);
        env.verifs.push(env.api.fileExists(env.cwd + "/" + arg_val)); // TODO: resolve path
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
        add_node_to_group(exp.group, nd);
    } else if (spawn == false && !curr_graph) {
        throw new Error(
            "A staged node must be assigned to a node group or be defined within a graph"
        );
    }

    if (spawn == true) {
        spawnQueue.add(nd);
    }

    return nd;
}

function create_edges(senders, receivers, op) {
    if (!Array.isArray(senders)) senders = [senders];
    if (!Array.isArray(receivers)) receivers = [receivers];

    var new_senders = [];
    for (var i = 0; i < senders.length; i++) {
        var sender = senders[i];
        if (typeof sender == "string") {
            // Get the corresponding node group
            new_senders = new_senders.concat(get_node_group(sender));
        } else {
            new_senders.push(sender);
        }
    }

    var new_receivers = [];
    for (var i = 0; i < receivers.length; i++) {
        var receiver = receivers[i];
        if (typeof receiver == "string") {
            // Get the corresponding node group
            new_receivers = new_receivers.concat(get_node_group(receiver));
        } else {
            new_receivers.push(receiver);
        }
    }

    for (var sender of new_senders) {
        for (var receiver of new_receivers) {
            var edge = get_edge(sender, receiver);
            if (edge == null) {
                edge = new Edge(sender, receiver, op);
                sender.out_edges.push(edge);
                receiver.in_edges.push(edge);
            }
            edge.graphs.push(curr_graph.name);
            curr_graph.edges.push(edge); // TODO: may only need to have a set of nodes in graph since we're only spawning a graph right now
            curr_graph.nodes.add(sender);
            curr_graph.nodes.add(receiver);
        }
    }
}

async function create_implicit_graph(op_exp, env) {
    var edges = [];
    curr_graph = new Graph(num_implicit_graphs);
    edges.push(await apply_op(env, op_exp.operator, op_exp.left, op_exp.right));
    curr_graph = null;

    Graphs[num_implicit_graphs++] = graph;
    spawn_graph(graph);

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
            if (is_piping_op(exp) && !curr_graph) {
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
            for (var exp of exp.prog) {
                var res = await evaluate(exp, env);
                // console.log(res); // TODO: remove print after debugging
            }

            // Wait until async verifications resolve
            return Promise.all(env.verifs).then(() =>
                new Spawner(env).spawn_nodes(spawnQueue)
            );

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
                if (is_node_group(first_arg.value)) {
                    spawn_node_group(first_arg.value);
                } else if (is_graph(first_arg.value)) {
                    spawn_graph(first_arg.value);
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
            if (is_graph(graph_name)) {
                throw new Error(`Graph \"${graph_name}\" already exists`);
            }

            var graph = new Graph(exp.graph);

            curr_graph = graph;
            await evaluate(exp.args[0], env);
            curr_graph = null;

            Graphs[graph_name] = graph;
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
            create_edges(senders, receivers, op);
            return senders; // Return senders so we can chain pipes
    }
    throw new Error("Can't apply operator " + op);
}

function print_graph(graph) {
    for (var edge of graph.edges) {
        console.log(
            edge.sender.script + " " + edge.pipe + " " + edge.receiver.script
        );
    }
}

function Environment(system_api) {
    this.cmds = {};
    this.api = system_api;
    this.verifs = [];
}

Environment.prototype = {
    get: function (cmd) {
        if (cmd in this.cmds) {
            return Promise.resolve(this.cmds[cmd]);
        } else {
            throw new Error("Unknown command " + cmd);
        }
    },
    def: function (name, value) {
        return Promise.resolve((this.cmds[name] = value));
    },
};

function Interpreter(runtime_api, builtins) {
    this.environ = new Environment(runtime_api);
    this.builtins = Object.assign({}, Interpreter.BUILTINS, builtins);

    // Add builtins to the environment
    Object.keys(this.builtins).forEach((cmd) => {
        this.environ.def(cmd, this.builtins[cmd]);
    });

    // Set environment variable
    this.environ.home = "/home";
    this.environ.cwd = this.environ.home;
}

// All functions should return a Promise
Interpreter.BUILTINS = {
    echo: (args, env) => {
        console.log(`echo ${args[0]}`);
        var text = args[0];
        return text ? text : "";
    },
    pwd: (args, env) => {
        console.log(`pwd ${args}`);
        return env.cwd;
    },
    cd: (args, env) => {
        console.log(`cd ${args}`);
        var path = args[0];
        if (!path) {
            env.cwd = env.home;
        }
        if (typeof path != "string") {
            throw new Error("cd - invalid path: ", path);
        }
        return env.api.directoryExists(env.cwd + path).then((cwd) => {
            env.cwd = env.cwd + path; // TODO: prevent double forward slashes
        });
    },
    mkdir: (args, env) => {
        console.log(`mkdir ${args}`);
    },
    cat: (args, env) => {
        console.log(`cat ${args}`);
    },
    ls: (args, env) => {
        console.log(`ls ${args}`);
        return env.api.listFiles(args[0] ? args[0] : cwd);
    },
    ps: (args, env) => {
        console.log(`ps ${args}`);
        return env.api.listProcesses();
    },
};

Interpreter.prototype.compile = function (input_str) {
    return parse(TokenStream(InputStream(input_str)));
};

Interpreter.prototype.evaluate = evaluate;

Interpreter.prototype.eval = async function (str) {
    console.log("[Interpreter] trying to evaluate " + str);
    return this.evaluate(this.compile(str), this.environ);
};

module.exports = Interpreter;

var fs = require("fs");
const MockRuntime = require("./MockRuntime.js");
var input = fs.readFileSync("./Interpreter/input-test.txt").toString("utf-8");

// var inputStream = InputStream(input);
// var tokenStream = TokenStream(inputStream);

// while ((token = tokenStream.next()) != null) {
//     console.log(token)
// }

// var AST = parse(tokenStream);
// console.log("AST:");
// console.log(AST);
// console.log();

// console.log(AST.prog[0].args[0]);
// console.log(AST.prog[0].args[0].elems);

// console.log(AST.prog[0])
// console.log(AST.prog[0].args[0].elems)

// console.log(AST.prog[0].args[0].elems[0].left)
// console.log(AST.prog[0].args[0].elems[0].right)

// console.log(AST.prog[0].left)
// console.log(AST.prog[0].right)

(async () => {
    var interpreter = new Interpreter(new MockRuntime());
    var AST = interpreter.compile(input);
    await interpreter.evaluate(AST, interpreter.environ);

    console.log("DONE EVALUATING");

    console.log("Graphs:");
    console.log(Graphs);

    console.log("Node Groups:");
    console.log(NodeGroups);

    console.log("Spawn queue:");
    console.log(spawnQueue);

    for (var graph_name in Graphs) {
        console.log(graph_name);
        print_graph(Graphs[graph_name]);
    }
})();
