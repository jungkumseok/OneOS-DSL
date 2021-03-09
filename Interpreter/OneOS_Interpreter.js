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

    // Note: We're not currently interpreting escape characters (/n, /t, etc.)
    function read_escaped(end) {
        var escaped = false,
            str = "";
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
            name: name,
        };
    }

    function parse_spawn_or_node_cmd() {
        cmd = input.next().value;

        var args = parse_args();

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
            name: name,
            attrs: attrs,
        };
    }

    function parse_cmd() {
        skip_cmd();

        var args = parse_args();

        return {
            type: "cmd",
            cmd: cmd.value,
            args: args,
        };
    }

    function parse_args() {
        var args = [];
        while (is_valid_arg()) {
            var arg = input.next();
            args.push(arg.value);
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
                name: tok.value,
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

var fs = require("fs");
var input = fs.readFileSync("./input.txt").toString("utf-8");

var inputStream = InputStream(input);
var tokenStream = TokenStream(inputStream);

// while ((token = tokenStream.next()) != null) {
//     console.log(token)
// }

var AST = parse(tokenStream);
console.log("AST:");
console.log(AST);
console.log();

// console.log(AST.prog[0])
// console.log(AST.prog[0].args[0].elems)

// console.log(AST.prog[0].args[0].elems[0].left)
// console.log(AST.prog[0].args[0].elems[0].right)

// console.log(AST.prog[0].left)
// console.log(AST.prog[0].right)
