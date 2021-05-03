const path = require("path");
const graphTypes = require("./structures.js");
const Node = graphTypes.Node;
const Edge = graphTypes.Edge;
const Graph = graphTypes.Graph;
const NodeGroup = graphTypes.NodeGroup;

// TODO: make cache for already spawned edges in spawn_nodes

/* Spawns the processes and connects pipes */

/* NOTE: The goal is to eventually have the spawner run an algorithme to
 * determine optimal placement of the nodes */

function Spawner(env) {
    this.env = env;
}

/*
 * Spawns a process for each Node in the runtime and creates pipes for their incoming
 * and outcoing edges where the other Node is also spawned.
 * @param nodes A list of Nodes and NodeGroups to be spawned. 
 */
Spawner.prototype.spawn_nodes = async function (nodes) {
    var spawningNodes = [];
    for (let node of nodes) {
        spawningNodes.push(
            this.env.api
                .spawn(path.resolve(this.env.cwd, node.script))
                .then((pid) => {
                    node.pid = pid;
                })
        );
    }

    var edge_cache = new Set(); // Reduces checks for if pipe exists with runtime
    return Promise.all(spawningNodes).then(async () => {
        for (let node of nodes) {
            var edges = [];
            // Nodes inherit edges from their group
            if (node.group) {
                edges = edges.concat(node.group.out_edges);
                edges = edges.concat(node.group.in_edges);
            }
            edges = edges.concat(node.out_edges);
            edges = edges.concat(node.in_edges);
            await this.create_pipes(get_node_level_edges(edges));
        }
    });
};

/*
 * Create a corresponding pipe in the runtime for each given Edge.
 * @param edges A list of Edges. 
 */
Spawner.prototype.create_pipes = async function (edges) {
    for (var edge of edges) {
        // console.log(edge);
        var sender_pid = edge.sender.pid;
        var receiver_pid = edge.receiver.pid;
        if (sender_pid != null && receiver_pid != null) {
            await this.env.api
                .pipeExists(sender_pid, receiver_pid)
                .then((exists) => {
                    // console.log(
                    //     exists +
                    //     " " +
                    //     edge.sender.script +
                    //     " ~> " +
                    //     edge.receiver.script
                    // );
                    if (!exists) {
                        return this.env.api.createPipe(
                            sender_pid,
                            receiver_pid
                        );
                    }
                });
        }
    }
};

/*
 * Creates equivalent edges between the individual Nodes in a NodeGroup
 * for any Edge where at least one party is a NodeGroup.
 * @param edges A list of Edges. 
 */
function get_node_level_edges(edges) {
    var new_edges = []
    for (var edge of edges) {
        var senders = edge.sender instanceof NodeGroup ? edge.sender.nodes : [edge.sender]
        var receivers = edge.receiver instanceof NodeGroup ? edge.receiver.nodes : [edge.receiver]

        for (var sender of senders) {
            for (var receiver of receivers) {
                new_edges.push(new Edge(sender, receiver, edge.pid))
            }
        }
    }

    return new_edges
}

module.exports = Spawner;
