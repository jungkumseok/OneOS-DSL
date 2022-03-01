function Node(script, name, agent_name) {
  this.name = name;
  this.agent = agent_name;
  this.group = null;
  this.script = script;
  this.in_edges = [];
  this.out_edges = [];
  this.pid = null;
}

function Edge(sender, receiver, pipe) {
  this.sender = sender;
  this.receiver = receiver;
  this.pipe = pipe;
}

function Graph(name) {
  this.name = name;
  this.edges = [];
}

function NodeGroup(name) {
  this.name = name;
  this.nodes = [];
  this.in_edges = [];
  this.out_edges = [];
}

module.exports.Node = Node;
module.exports.Edge = Edge;
module.exports.Graph = Graph;
module.exports.NodeGroup = NodeGroup;
