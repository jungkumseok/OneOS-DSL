var InputStream = require("./input-stream.js");
var TokenStream = require("./token-stream.js");
var parse = require("./parser.js");

function Node(name, spawned, script, args, attrs) {
    this.name = name;
    this.spawned = spawned;
    this.script = script;
    this.args = args;
    this.attrs = attrs;
}

function Edge(sender, receiver, pipe) {
    this.sender = sender;
    this.receiver = receiver;
    this.pipe = pipe;
}

function Graph(name, edges) {
    this.name = name;
    this.edges = edges;
}

// Maps name to a graph
var Graphs = {};

// Maps name to a list of one or more nodes (staged or spawned)
var NodeGroups = {};

// Queue of nodes, groups, and graphs needing to be spawned
var spawnQueue = [];

var within_graph = false;
var within_implicit_graph = false; // TODO: this is temporary hacky way to add a graph rather than individual nodes to the spawnQueue
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

function spawn_node_group(name) {
    spawnQueue.push(NodeGroups[name]);
}

function spawn_graph(name) {
    spawnQueue.push(Graphs[name]);
}

function generate_node_name(file_name) {
    // TODO: properly implement node naming
    return file_name + Math.floor(Math.random() * 100);
}

function push_node_group(group, nd) {
    if (NodeGroups[group] == undefined) {
        NodeGroups[group] = [];
    }
    NodeGroups[group].push(nd);
}

function verify_node_arg(cmd, first_arg) {
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
        // TODO: check the file exists
    }
}

function get_args(args_arr) {
    // TODO: parse command options (e.g. --help or -h)?

    return args_arr.map((arg) => arg.value);
}

function create_node(exp, spawn) {
    var first_arg = exp.args[0];
    verify_node_arg(cmd, first_arg);

    var file_name = first_arg.value;

    var name = generate_node_name(file_name); // TODO: an identifier may not be needed or could be PID returned by runtime when process starts

    var args = get_args(exp.args.slice(1));

    var nd = new Node(name, spawn, file_name, args, exp.attrs);
    if (exp.group) {
        push_node_group(exp.group, nd);
    } else if (spawn == false && within_graph == false) {
        throw new Error(
            "A staged node must be assigned to a node group or be defined within a graph"
        );
    }

    if (spawn == true && within_implicit_graph == false) {
        spawnQueue.push(nd);
    }

    return nd;
}

function create_implicit_graph(op_exp) {
    var edges = [];
    within_graph = true;
    within_implicit_graph = true;
    edges.push(apply_op(op_exp.operator, op_exp.left, op_exp.right));
    within_graph = false;
    within_implicit_graph = false;

    var graph = new Graph(num_implicit_graphs, edges);
    Graphs[num_implicit_graphs++] = graph;
    spawnQueue.push(graph);
    return graph;
}

function evaluate(exp) {
    switch (exp.type) {
        case "num":
        case "str":
        case "id":
            return exp.value;

        case "cmd":
            return evaluate_cmd(exp);

        case "op":
            // A graph is implicitly created when a piping is used outside of the connect command edge list
            // e.g. 10 * (spawn map.js) -> 4 * (spawn reduce.js #camera) ~> spawn reduce.js log.txt
            if (is_piping_op(exp) && within_graph == false) {
                return create_implicit_graph(exp);
            } else {
                return apply_op(exp.operator, exp.left, exp.right);
            }

        case "list":
            var val = [];
            for (var exp of exp.elems) {
                val.push(evaluate(exp));
            }
            return val;

        case "prog":
            exp.prog.forEach(function (exp) {
                console.log(evaluate(exp)); // TODO: remove print after debugging
            });
            return;

        default:
            throw new Error("I don't know how to evaluate " + exp.type);
    }
}

function evaluate_cmd(exp) {
    var cmd = exp.cmd;
    switch (cmd) {
        case "ls":
        case "ps":
        case "cd":
        case "pwd":
        case "cat":
            console.log("UNIX COMMAND: " + cmd);
            return;

        case "node":
            return create_node(exp, false);

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
                return create_node(exp, true);
            }

        case "connect":
            // Create a graph
            // Must have a name
            // Each entry in the list should be an operation
            // TODO: ask Kumseok what format the internal graph structure should have

            var graph_name = exp.graph;
            if (!graph_name) {
                throw new Error("A graph must have a name");
            } else if (is_graph(graph_name)) {
                throw new Error(`Graph \"${graph_name}\" already exists`);
            }

            within_graph = true;
            var edgeList = evaluate(exp.args[0]);
            within_graph = false;

            console.log("Graph edgeList: ");
            console.log(edgeList);

            var graph = new Graph(exp.graph, edgeList);
            Graphs[graph_name] = graph;
            return graph;

        case "spawn_connect":
            // Can create an unamed graph (no, automatically assign a name) Graph1
            console.log("spawn_connect cmd not yet supported");
            return;

        default:
            /* should never get here */
            throw new Error("Unsupported command: " + cmd);
    }
}

function apply_op(op, left_exp, right_exp) {
    function num(x) {
        if (typeof x != "number")
            throw new Error("Expected number but got " + x);
        return x;
    }
    switch (op) {
        case "*":
            var x = evaluate(left_exp);
            var vals = []
            for (var i = 0; i < num(x); i++) {
                vals.push(evaluate(right_exp));
            }
            return vals;
        case "~>":
        case "->":
        case "-*>":
        case "~*>":
        case "~/>":
            return new Edge(evaluate(left_exp), evaluate(right_exp), op);
    }
    throw new Error("Can't apply operator " + op);
}

var fs = require("fs");
var input = fs.readFileSync("./input-test.txt").toString("utf-8");

var inputStream = InputStream(input);
var tokenStream = TokenStream(inputStream);

// while ((token = tokenStream.next()) != null) {
//     console.log(token)
// }

var AST = parse(tokenStream);
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

evaluate(AST);

console.log("Graphs:");
console.log(Graphs);

console.log("Node Groups:");
console.log(NodeGroups);

console.log("Spawn queue:");
console.log(spawnQueue);
