function InputStream(input) {
    var pos = 0,
        line = 1,
        col = 0;
    return {
        next: next,
        peek: peek,
        peek2: peek2,
        eof: eof,
        croak: croak,
    };
    function next() {
        var ch = input.charAt(pos++);
        if (ch == "\n") line++, (col = 0);
        else col++;
        return ch;
    }
    function peek() {
        return input.charAt(pos);
    }
    function peek2() {
        return input.charAt(pos + 1);
    }
    function eof() {
        return peek() == "";
    }
    function croak(msg) {
        throw new Error(msg + " (" + line + ":" + col + ")");
    }
}

function TokenStream(input) {
    var current = null;

    var cmds = " ls ps cd pwd cat spawn connect node ";
    var keywords = " as ";

    return {
        next: next,
        peek: peek,
        eof: eof,
        croak: input.croak,
    };

    function is_cmd(x) {
        return cmds.indexOf(" " + x + " ") >= 0;
    }

    function is_keyword(x) {
        return keywords.indexOf(" " + x + " ") >= 0;
    }

    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }

    function is_op_char(ch) {
        // Operators: *, ->, -*>, ~>, ~/>, ~*>

        // Check if "-" is part of an operator
        if (ch == "-" && input.peek2() != "*" && input.peek2() != ">") {
            return false;
        }

        // Check if "/" is part of an operator
        if (ch == "/" && input.peek2() != ">") {
            return false;
        }

        return "*-/~>".indexOf(ch) >= 0;
    }

    function is_punc(ch) {
        return "()[],".indexOf(ch) >= 0;
    }

    function is_new_line(ch) {
        return "\n\r".indexOf(ch) >= 0;
    }

    function is_whitespace(ch) {
        return " \t".indexOf(ch) >= 0;
    }

    function is_word(ch) {
        return ch != " " && !is_punc(ch) && !is_op_char(ch) && !is_new_line(ch);
    }

    function read_while(predicate) {
        var str = "";
        while (!input.eof() && predicate(input.peek())) str += input.next();
        return str;
    }

    function read_number() {
        // Note: can add support for hexadecimal numbers here too if we want

        var has_dot = false;
        var number = read_while(function (ch) {
            if (ch == ".") {
                if (has_dot) return false;
                has_dot = true;
                return true;
            }
            return is_digit(ch);
        });
        return { type: "num", value: parseFloat(number) };
    }

    function read_word() {
        // We put as few restrictions as possible on what constitutes a word, so
        // that arguments to a command are not restricted.

        /* Types of words: command, keyword, word (i.e. any other word) */

        // Stop reading when reach a space, punctuation, or an operator
        var id = read_while(is_word);
        return {
            type: is_cmd(id) ? "cmd" : is_keyword(id) ? "kw" : "w",
            value: id,
        };
    }

    // Note: We're not currently interpreting escape characters (\n, \t, etc.)
    function read_escaped(end) {
        var escaped = false;
        var str = "";
        input.next();
        while (!input.eof()) {
            var ch = input.next();
            if (escaped) {
                str += ch;
                escaped = false;
            } else if (ch == "\\") {
                escaped = true;
            } else if (ch == end) {
                break;
            } else {
                str += ch;
            }
        }
        return str;
    }

    function read_string() {
        return { type: "str", value: read_escaped('"') };
    }

    function read_attr() {
        input.next();
        var str = read_while(is_word);
        if (str == "") {
            input.croak("# must be followed by attribute name");
        }

        return {
            type: "attr",
            value: str,
        };
    }

    // Fetches the next token
    function read_next() {
        read_while(is_whitespace);
        if (input.eof()) return null;
        var ch = input.peek();

        // TODO: also suport single quotes?
        if (ch == '"') {
            return read_string();
        }

        if (is_digit(ch)) {
            return read_number();
        }

        if (is_punc(ch)) {
            return {
                type: "punc",
                value: input.next(),
            };
        }

        if (is_new_line(ch)) {
            read_while(is_new_line);
            return {
                type: "new_line",
            };
        }

        if (is_op_char(ch)) {
            return {
                type: "op",
                value: read_while(is_op_char),
            };
        }

        if (ch == "#") {
            return read_attr();
        }

        // Otherwise assume it's a word that has some meaning
        return read_word();

        // input.croak("Can't handle character: " + ch);
    }

    function peek() {
        return current || (current = read_next());
    }

    function next() {
        var tok = current;
        current = null;
        return tok || read_next();
    }

    function eof() {
        return peek() == null;
    }
}

function parse(input) {
    var PRECEDENCE = {
        "~>": 1,
        "->": 1,
        "~*>": 1,
        "~/>": 1,
        "*": 2,
    };

    return parse_toplevel();

    function is_punc(ch) {
        var tok = input.peek();
        return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
    }

    function is_kw(kw) {
        var tok = input.peek();
        return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
    }

    function is_op(op) {
        var tok = input.peek();
        return tok && tok.type == "op" && (!op || tok.value == op) && tok;
    }

    function is_new_line() {
        var tok = input.peek();
        return tok && tok.type == "new_line" && tok;
    }

    function is_word() {
        var tok = input.peek();
        return tok && tok.type == "w" && tok;
    }

    function is_str() {
        var tok = input.peek();
        return tok && tok.type == "str" && tok;
    }

    function is_num() {
        var tok = input.peek();
        return tok && tok.type == "num" && tok;
    }

    function is_valid_arg() {
        return is_word() || is_str() || is_num();
    }

    function is_cmd(cmd) {
        var tok = input.peek();
        return tok && tok.type == "cmd" && (!cmd || cmd == tok.value) && tok;
    }

    function is_attr() {
        var tok = input.peek();
        return tok && tok.type == "attr" && tok;
    }

    function is_list() {
        return is_punc("[");
    }

    function skip_punc(ch) {
        if (is_punc(ch)) input.next();
        else input.croak('Expecting punctuation: "' + ch + '"');
    }

    function skip_kw(kw) {
        if (is_kw(kw)) input.next();
        else input.croak('Expecting keyword: "' + kw + '"');
    }

    function skip_op(op) {
        if (is_op(op)) input.next();
        else input.croak('Expecting operator: "' + op + '"');
    }

    function skip_cmd(op) {
        if (is_cmd(op)) input.next();
        else input.croak('Expecting command: "' + op + '"');
    }

    function unexpected() {
        input.croak("Unexpected token: " + JSON.stringify(input.peek()));
    }

    function maybe_op(left, my_prec, expectIdentifier) {
        var tok = is_op();
        if (tok) {
            var his_prec = PRECEDENCE[tok.value];
            if (his_prec > my_prec) {
                input.next();
                return maybe_op(
                    {
                        type: "op",
                        operator: tok.value,
                        left: left,
                        right: maybe_op(parse_atom(expectIdentifier), his_prec),
                    },
                    my_prec
                );
            }
        }
        return left;
    }

    function delimited(start, stop, separator, parser) {
        var a = [];
        var first = true;
        skip_punc(start);
        while (!input.eof()) {
            if (is_punc(stop)) break;
            if (first) first = false;
            else skip_punc(separator);
            if (is_punc(stop)) break;
            a.push(parser());
        }
        skip_punc(stop);
        return a;
    }

    function parse_connect_cmd() {
        skip_cmd("connect");

        // Connect expects a single list as the argument
        if (is_list()) {
            // Words in the list that are not cmds are considered to be
            // identifiers (i.e. the names) of node groups
            parsedList = parse_list(true);
        } else {
            input.croak("Expecting list as argument to connect command.");
        }

        // Parse "as" <name>
        var name = parse_name();

        return {
            type: "cmd",
            cmd: "connect",
            args: [parsedList],
            graph: name,
        };
    }

    function parse_spawn_or_node_cmd() {
        cmd = input.next().value;

        var args = parse_args();
        if (args.length == 0) {
            input.croak(
                `\"${cmd}\" command expects a *.js or *.py file as an argument`
            );
        }

        // Parse attributes
        var attrs = [];
        while (is_attr()) {
            var attr = input.next();
            attrs.push(attr.value);
        }

        // Parse "as" <name>
        var name = parse_name();

        return {
            type: "cmd",
            cmd: cmd,
            args: args,
            group: name,
            attrs: attrs,
        };
    }

    function parse_cmd() {
        cmd = input.next().value;

        // TODO: suport unix style options?
        var args = parse_args();

        return {
            type: "cmd",
            cmd: cmd,
            args: args,
        };
    }

    function parse_args() {
        var args = [];
        while (is_valid_arg()) {
            args.push(input.next());
        }
        return args;
    }

    function parse_name() {
        var name = null;
        if (is_kw("as")) {
            input.next();
            if (is_str()) {
                name = input.next().value;
            } else {
                input.croak('Expecting string after "as" keyword.');
            }
        }
        return name;
    }

    function parse_list(expectIdentifier) {
        var parsed_elems = delimited("[", "]", ",", () =>
            parse_expression(expectIdentifier)
        );
        return {
            type: "list",
            elems: parsed_elems,
        };
    }

    function parse_atom(expectIdentifier) {
        // console.log(input.peek());
        if (is_punc("(")) {
            input.next();
            var exp = parse_expression();
            skip_punc(")");
            return exp;
        }

        if (is_list()) {
            return parse_list(expectIdentifier);
        }

        if (is_cmd("connect")) {
            return parse_connect_cmd();
        }

        if (is_cmd("spawn") || is_cmd("node")) {
            return parse_spawn_or_node_cmd();
        }

        if (is_cmd()) {
            return parse_cmd();
        }

        var tok = input.peek();

        if (expectIdentifier && tok.type == "w") {
            tok = input.next();
            return {
                type: "id",
                value: tok.value,
            };
        }

        if (tok.type == "num" || tok.type == "str") {
            tok = input.next();
            return tok;
        }

        unexpected();
    }

    function parse_toplevel() {
        var prog = [];
        while (!input.eof()) {
            if (is_new_line()) {
                input.next();
                continue;
            }
            prog.push(parse_expression());
        }
        return { type: "prog", prog: prog };
    }

    function parse_expression(expectIdentifier) {
        return maybe_op(parse_atom(expectIdentifier), 0, expectIdentifier);
    }
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

function Node(name, spawned, script, args, attrs) {
    this.name = name;
    this.spawned = spawned;
    this.script = script;
    this.args = args;
    this.attrs = attrs;
}

// Maps name to a graph
var Graphs = {};

// Maps name to a list of one or more nodes (staged or spawned)
var NodeGroups = {};

var spawnQueue = [];

// Can have unamed processes
// - keep a list of all processes?

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
    // TODO: Likely call something instead
    // var node_group = NodeGroups[name];
    // groups_to_spawn.push(node_group);
}

function spawn_graph(name) {
    // TODO: Likely call something instead
    // var graph = Graphs[name];
    // graphs_to_spawn.push(graph);
}

function generate_node_name(file_name) {
    // TODO: ask Kumseok how to identify files
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

function create_node(exp, spawn) {
    var file_name = exp.args[0];
    verify_node_arg(cmd, file_name);

    var name = generate_node_name(file_name); // TODO: a name may not be needed

    var nd = new Node(name, spawn, file_name, exp.args.slice(1), exp.attrs);
    if (exp.group) {
        push_node_group(exp.group, nd);
    } else if (spawn == false) {
        throw new Error("A staged node must be assigned to a node group");
    }

    if (spawn == true) {
        spawnQueue.push(nd);
    }

    return nd;
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
            return apply_op(exp.operator, exp.left, exp.right);

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
            // Automatically assign it to a group as <script> if no name specified?
            // Must have one argument that's a JS or python file
            // -check that the file exists
            return create_node(exp, false);

        case "spawn":
            // Spawn can be followed by either a single identifier (of a node group or graph)
            // or some arguments
            // Automatically assign a name as <script>.# if no name specified

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
                        `\"${first_arg}\" does not correspond to a node group or graph`
                    );
                }
            } else {
                // We are spawning a process
                return create_node(exp, true);
            }

        // Return reference to node-group or graph?

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

            var edges = evaluate(exp.args[0]);
            console.log(edges);

            // var edgeList = exp.args[0];
            // for (var edge of edgeList) {
            //     if (is_piping_op(exp)) {
            //         apply_op(edge);
            //     } else {
            //         throw new Error(
            //             "Expecting piping operation in connect list"
            //         );
            //     }
            // }

            var graph = new Graph(exp.graph, edges);
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
            for (var i = 0; i < num(x); i++) {
                evaluate(right_exp);
            }
            return;
        case "~>":
        case "->":
        case "-*>":
        case "~*>":
        case "~/>":
            return new Edge(eval(left_exp), eval(right_exp), op);
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

evaluate(AST);


// console.log(AST.prog[0].args[0]);
// console.log(AST.prog[0].args[0].elems);

// console.log(AST.prog[0])
// console.log(AST.prog[0].args[0].elems)

// console.log(AST.prog[0].args[0].elems[0].left)
// console.log(AST.prog[0].args[0].elems[0].right)

// console.log(AST.prog[0].left)
// console.log(AST.prog[0].right)
