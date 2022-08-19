const processString = require("./processString");

//node represents processes
function Node(script, name, agent_name) {
  this.name = name;
  this.agent = agent_name;
  this.group = null;
  this.script = script;
  this.in_edges = [];
  this.out_edges = [];
  this.pid = null;
  this.tags = {};
}

function Edge(sender, receiver, pipe) {
  this.sender = sender;
  this.receiver = receiver;
  this.pipe = pipe;
}

function Graph(name) {
  this.name = name;
  this.edges = [];
  this.nodes = [];
  this.tags = {};
}

function NodeGroup(name) {
  this.name = name;
  this.nodes = [];
  this.in_edges = [];
  this.out_edges = [];
}

function Selector(str, env) {
  this.origStr = str;
  this.str = str;
  this.evalStr = "";
  this.tags = [];
  this.words = str.split(/[\s|&]/);
  for (var i = 0; i < this.words.length; i++) {
    this.words[i] = this.words[i].trim();
    //remove all "("
    this.words[i] = this.words[i].replace(/\(/g, "");
    //remove all ")"
    this.words[i] = this.words[i].replace(/\)/g, "");
  }
  //split each word by "="
  for (var i = 0; i < this.words.length; i++) {
    var word = this.words[i];
    if (word.includes("=") || word.includes(">") || word.includes("<")) {
      //split by "=" or ">" or "<"
      var split = word.split(/[=><]/);
      if (split.length != 2) {
        throw new Error("Invalid selector: " + str);
      }
      var operator = "";
      if (word.includes("=")) {
        operator = "=";
      }
      if (word.includes(">")) {
        operator = ">";
        if (split[1].startsWith('"') || split[1].endsWith('"')) {
          throw new Error("Invalid selector: " + str);
        }
      }
      if (word.includes("<")) {
        operator = "<";
        if (split[1].startsWith('"') || split[1].endsWith('"')) {
          throw new Error("Invalid selector: " + str);
        }
      }
      this.tags.push({
        key: split[0],
        value: split[1],
        operator: operator,
        wordIndex: i,
        curVal: false,
      });
    } else {
      throw new Error("Invalid selector: " + str);
    }
  }
  //replace all "|" with "||" in str
  this.str = this.str.replace(/\|/g, "||");
  //replace all "&" with "&&" in str
  this.str = this.str.replace(/\&/g, "&&");
  this.evalStr = this.str;
  //try eval the evalStr
  this.testStr = this.str;
  for (var i = 0; i < this.words.length; i++) {
    this.testStr = this.testStr.replace(
      new RegExp(this.words[i], "g"),
      "false"
    );
  }
  try {
    processString(this.testStr);
  } catch (e) {
    throw new Error("Incorrect selector format");
  }
}

module.exports.Node = Node;
module.exports.Edge = Edge;
module.exports.Graph = Graph;
module.exports.NodeGroup = NodeGroup;
module.exports.Selector = Selector;
