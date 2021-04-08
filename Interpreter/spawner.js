/* Spawns the processes and connects pipes */

/* NOTE: The goal is eventually to have the spawner run an algorithme to
 * determine optimal placement of the nodes */

function Spawner(env) {
    this.env = env;
}

Spawner.prototype.spawn_nodes = function (nodes) {
    var spawningNodes = [];
    for (var node of nodes) {
        spawningNodes.push(
            this.env.api.spawn(node.script).then((pid) => {
                node.pid = pid;
            })
        );
    }

    return Promise.all(spawningNodes).then(() => {
        for (var node of nodes) {
            return Promise.all([
                connect_out_pipes(node.out_edges),
                connect_in_pipes(node.in_edges),
            ]);
        }
    });
};

function connect_out_pipes(out_edges) {
    var connectingEdges = [];
    for (var edge of out_edges) {
        if (edge.receiver.pid != null) {
            connectingEdges.push(
                this.env.api.createPipe(edge.sender.pid, edge.receiver.pid)
            );
        }
    }
    return Promise.all(connectingEdges);
}

function connect_in_pipes(in_edges) {
    var connectingEdges = [];
    for (var edge of in_edges) {
        if (edge.sender.pid != null) {
            connectingEdges.push(
                this.env.api.createPipe(edge.sender.pid, edge.receiver.pid)
            );
        }
    }
    return Promise.all(connectingEdges);
}

module.exports = Spawner;
