function Node(script, args, attrs) {
    this.group = null;
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
    this.graphs = []; // Graphs the edge is a part of (TODO: is this necessary?)
}

function Graph(name) {
    this.name = name;
    // this.nodes = new Set();
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
