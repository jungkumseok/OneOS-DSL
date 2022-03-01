function TokenStream(input) {
  var curr_tok = null;
  var next_tok = null;

  var cmds = " spawn node connect spawn_connect ";
  var keywords = " as ";

  return {
    next: next,
    peek: peek,
    peek2: peek2,
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

    return "*/~".indexOf(ch) >= 0;
  }

  function is_punc(ch) {
    return "[]".indexOf(ch) >= 0;
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
      input.croak("# must be followed by the attribute name");
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

    if (ch == '"' || ch == '"') {
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
    return curr_tok || (curr_tok = read_next());
  }

  function peek2() {
    if (!curr_tok) curr_tok = read_next();
    return next_tok || (next_tok = read_next());
  }

  function next() {
    var tok = curr_tok;
    curr_tok = next_tok;
    next_tok = null;
    return tok || read_next();
  }

  function eof() {
    return peek() == null;
  }
}

module.exports = TokenStream;
