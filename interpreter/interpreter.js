const InputStream = require("./input-stream.js");
const TokenStream = require("./token-stream.js");
const parse = require("./parser.js");
const evaluate = require("./evaluator.js");
const path = require("path");

const windows = process.platform === "win32";

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
  doneEval: function () {
    this.verifs = [];
    this.nodeSpawnQueue.clear();
    this.edgeSpawnQueue.clear();
  },
};

function Interpreter(runtime_api, builtins) {
  this.environ = new Environment(runtime_api);
  this.builtins = Object.assign({}, Interpreter.BUILTINS, builtins);

  // Add builtins to the environment
  Object.keys(this.builtins).forEach((cmd) => {
    this.environ.def(cmd, this.builtins[cmd]);
  });

  // Set environment variables
  this.environ.home = windows ? "C:\\home" : "/home";
  this.environ.cwd = this.environ.home;

  // Maps name to a graph
  this.environ.Graphs = {};

  // Maps name to a list of one or more nodes (staged or spawned)
  this.environ.NodeGroups = {};

  // Queue of nodes needing to be spawned
  this.environ.nodeSpawnQueue = new Set();

  // Queue of edges needing to be spawned
  this.environ.edgeSpawnQueue = new Set();

  // Map of variable names to nodes
  this.environ.nodeVarMap = new Map();

  // Map of variable names to edgesafevalu
  this.environ.edgeVarMap = new Map();

  // Map of variable names to graphs
  this.environ.graphVarMap = new Map();
  this.environ.selectorVarMap = new Map();
  this.environ.curr_graph = null;
  this.environ.graphStack = [];
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
    var cd_path = args[0];
    if (!cd_path) {
      env.cwd = env.home;
      return Promise.resolve();
    }
    if (typeof cd_path != "string") {
      throw new Error("cd - invalid path: ", cd_path);
    }
    var new_cwd = path.resolve(env.cwd, cd_path);
    return env.api.directoryExists(new_cwd).then(() => {
      env.cwd = new_cwd;
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
    return env.api.listFiles(args[0] ? args[0] : env.cwd);
  },
  ps: (args, env) => {
    console.log(`ps ${args}`);
    return env.api.listProcesses();
  },
  kill: (args, env) => {
    console.log(`kill ${args[0]}`);
    return env.api.killProcess(args[0]);
  },
  ls_pipes: (args, env) => {
    console.log(`ls_pipes ${args}`);
    return env.api.listPipes();
  },
};

Interpreter.prototype.compile = function (input_str) {
  // if (input_str.includes("agent")) {
  //   input_str = input_str.replace("(", " ");
  //   input_str = input_str.replace(")", " ");
  //   input_str = input_str.replace(",", " ");
  // }
  return parse(TokenStream(InputStream(input_str)));
};

Interpreter.prototype.evaluate = evaluate;

Interpreter.prototype.eval = async function (str) {
  console.log("[Interpreter] trying to evaluate " + str);
  return this.evaluate(this.compile(str), this.environ);
};
//test the code manually 
Interpreter.prototype.evalGraph = async function (input) {
  var lines = input.split("\n");
  for (var line of lines) {
    await this.evaluate(this.compile(line), this.environ);
  }
};

// TODO: updated print functions now that sender and receiver can be Node Groups

Interpreter.prototype.print_graph = function (graph) {
  for (var edge of graph.edges) {
    console.log(
      edge.sender.script +
        (edge.sender.args.length > 0 ? " " : "") +
        edge.sender.args +
        (edge.sender.attrs.length > 0 ? " #" : "") +
        edge.sender.attrs +
        " " +
        edge.pipe +
        " " +
        edge.receiver.script +
        (edge.receiver.args.length > 0 ? " " : "") +
        edge.receiver.args +
        (edge.receiver.attrs.length > 0 ? " #" : "") +
        edge.receiver.attrs
    );
  }
};

Interpreter.prototype.print_node_group = function (group) {
  for (var node of group.nodes) {
    console.log(
      node.script +
        (node.args.length > 0 ? " " : "") +
        node.args +
        (node.attrs.length > 0 ? " #" : "") +
        node.attrs
    );
  }
};

module.exports = Interpreter;
