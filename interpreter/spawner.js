const path = require("path");

/* Spawns the processes and connects pipes */

/* NOTE: The goal is to eventually have the spawner run an algorithme to
 * determine optimal placement of the nodes */

function Spawner(env) {
    this.env = env;
}

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

    return Promise.all(spawningNodes).then(async () => {
        var connectingPipes = [];
        for (let node of nodes) {
            connectingPipes.push(
                await Promise.all([
                    this.connect_out_pipes(node.out_edges),
                    this.connect_in_pipes(node.in_edges),
                ])
            );
        }
        return Promise.all(connectingPipes);
    });
};

Spawner.prototype.connect_out_pipes = async function (out_edges) {
    for (var edge of out_edges) {
        var sender_pid = edge.sender.pid;
        var receiver_pid = edge.receiver.pid;
        if (receiver_pid != null) {
            await this.env.api
                .pipeExists(sender_pid, receiver_pid)
                .then((exists) => {
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

Spawner.prototype.connect_in_pipes = async function (in_edges) {
    for (var edge of in_edges) {
        var sender_pid = edge.sender.pid;
        var receiver_pid = edge.receiver.pid;
        if (sender_pid != null) {
            await this.env.api
                .pipeExists(sender_pid, receiver_pid)
                .then((exists) => {
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

module.exports = Spawner;
