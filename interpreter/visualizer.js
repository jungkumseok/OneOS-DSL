// an express app for visualizing the runtime on the web browser

const ws = require('ws');
const express = require('express');
const MockRuntime = require('./mock-runtime.js');
const Interpreter = require('./interpreter.js');

// TODO: load the following from a file
const config = {
	port: 3000,
	wsPort: 8000
};

// initialize Mock Runtime
let runtime = new MockRuntime();
let interpreter = new Interpreter(runtime);

const state = {
	runtime: runtime
};
state.methods = {
	resetRuntime: async (clients) => {
		runtime = new MockRuntime();
		interpreter = new Interpreter(runtime);
		state.runtime = runtime;

		clients.forEach(client => {
			client.send(JSON.stringify([ 'updateRuntime', state.runtime ]));
		});
	},
	evaluateFile: async (clients, content) => {
		runtime = new MockRuntime();
		interpreter = new Interpreter(runtime);
		state.runtime = runtime;

		let lines = content.split('\n');
		for (let line of lines){
			await interpreter.eval(line);
		}

		clients.forEach(client => {
			client.send(JSON.stringify([ 'updateRuntime', state.runtime ]));
		});
	},
	evaluate: async (clients, line) => {
		let result = await interpreter.eval(line);
		clients.forEach(client => {
			client.send(JSON.stringify([ 'updateRuntime', state.runtime ]));
		});
		return [ 'print', JSON.stringify(result) ];
	},
	getState: async (clients) => {
		clients.forEach(client => {
			client.send(JSON.stringify([ 'updateRuntime', state.runtime ]));
		});
	}
}

// websocket for communication
const pubsub = new ws.Server({ port: config.wsPort });
pubsub.on('connection', client => {
	console.log(`new client connected. currently ${pubsub.clients.size} clients`);
	client.on('message', async data => {
		let message = JSON.parse(data);

		try {
			if (message instanceof Array){
				let method = state.methods[message[0]];
				
				if (method){
					let result = await method.apply(null, [ pubsub.clients ].concat(message.slice(1)));
					
					if (result){
						client.send(JSON.stringify(result));
					}
				}
				else {
					throw 'Invalid method';
				}
			}
			else {
				throw 'Invalid message format';
			}
		}
		catch (err) {
			client.send(JSON.stringify([ 'error', String(err) ]));
		}
	});
});

const app = express();

app.use('/', express.static('visualizer', { extensions: ['html'] }))

app.listen(config.port, () => {
	console.log(`Visualizer started, listening to port ${config.port}`);
})