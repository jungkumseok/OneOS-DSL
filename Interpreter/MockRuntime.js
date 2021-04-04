const stream = require('stream');

const SampleDirectory = {
	'bin': {
		'apt': 'Package Manager',
		'ls': 'ListFiles'
	},
	'dev': {
	},
	'etc': {
	},
	'home': {
		'ubc': {
			'bin': {
				'sensor.js': 'Sensor Application', 
				'actuator.js': 'Actuator Application',
				'transformer.js': 'Actuator Application'
			}
		}
	},
	'lib': {
	},
	'sys': {

	},
	'usr': {
	},
	'var': {
	}
	
}

// helper functions
function selectRandom(list) {
	return list[Math.floor(list.length * Math.random())];
}
// end of helpers

class Host {
	constructor (id){
		this.id = id;
		this.procs = [];
	}

	addProcess (proc){
		this.procs.push(proc);
	}
}

class Process {
	constructor (host, file){
		this.id = Process.getID.next().value;
		this.host = host;
		this.program = file;

		this.host.addProcess(this);
	}

	setProgram (file) {
		this.program = file;
	}

	setHost (host) {
		this.host = host;
	}
}
Process.getID = (function* getID(){
	let next = 0;
	while (true){
		yield next++;
	}
})();

class Pipe {
	constructor (source, sink) {
		this.source = source;
		this.sink = sink;
	}

	get id () {
		return this.source.id + '-' + this.sink.id;
	}
}

class File {
	constructor (name){
		this.name = name;
		this.content = null;
	}
}

class Directory {
	constructor (){
		this.content = {}
	}

	getContent (relPath) {
		if (typeof relPath === 'string'){
			let tokens = relPath.split('/');
			if (tokens[0] === '') throw new Error('Directory..getContent expects a relative path');
			return this.getContent(tokens);
		}
		else if (relPath instanceof Array && relPath.length > 0){
			if (this.content[relPath[0]]){
				if (relPath.length === 1) return this.content[relPath[0]];
				else return this.content[relPath[0]].getContent(relPath.slice(1));
			}
			else throw new Error(relPath + ' does not exist');
		}
		else throw new Error('Invalid argument type for Directory..getContent');
	}

	listContent () {
		return Object.keys(this.content)
			.map(key => ({
				name: key,
				type: this.content[key] instanceof Directory ? 'directory' : 'file'
			}))
	}
}
Directory.fromJSON = data => {
	return Object.keys(data)
		.reduce((dir, key) => {
			if (typeof data[key] === 'object') {
				dir.content[key] = Directory.fromJSON(data[key]);	
			}
			else {
				dir.content[key] = new File(key);
			}
			return dir;
		}, new Directory());
}

class MockRuntime {
	constructor (){
		this.hosts = [
			new Host('pi-0'),
			new Host('pi-1'),
			new Host('pi-2'),
			new Host('pi-3'),
			new Host('pi-4')
		];
		this.root = Directory.fromJSON(SampleDirectory);
		this.procs = [];
		this.pipes = [];
	}

	/* equivalent to the unix `ls` command */
	async listFiles (absPath){
		if (typeof absPath === 'string'){
			let tokens = absPath.split('/');
			if (tokens[0] !== '') throw new Error('MockRuntime..listFiles expects an absolute path');
			let item = this.root.getContent(tokens.slice(1));
			if (item instanceof Directory) return item.listContent();
			else return [ { name: item.name, type: 'file' } ];
		}
		else throw new Error('Invalid argument type for MockRuntime..listFiles');
	}

	/* equivalent to the unix `ps` command */
	async listProcesses () {
		return this.procs;
	}

	/* returns a list of pipes (unix equivalent doesn't exist) */
	async listPipes () {
		return this.pipes;
	}

	/* starts a new process */
	async spawn (agentAbsPath){
		if (typeof agentAbsPath === 'string'){
			let tokens = agentAbsPath.split('/');
			if (tokens[0] !== '') throw new Error('MockRuntime..spawn expects an absolute path');
			let item = this.root.getContent(tokens.slice(1));
			// console.log(item);
			if (item instanceof File){
				let host = selectRandom(this.hosts);
				let proc = new Process(host, item);
				this.procs.push(proc);

				return proc.id;
			}
			else throw new Error('Cannot spawn a directory');
		}
		else throw new Error('Invalid argument type for MockRuntime..spawn');
	}

	/* kills a process */
	async kill (pid) {
		let index = this.procs.findIndex(item => item.id === pid);
		if (index > -1){
			this.procs.splice(index, 1);
		}
		else throw new Error('Process with ID = ' + pid + ' does not exist');
	}

	/* creates a new pipe between 2 processes */
	async createPipe (sourceId, sinkId) {
		let id = sourceId + '-' + sinkId;

		let sourceIndex = this.procs.findIndex(item => item.id === sourceId);
		let sinkIndex = this.procs.findIndex(item => item.id === sinkId);

		let pipeIndex = this.pipes.findIndex(item => item.id === id);

		if (sourceIndex < 0){
			throw new Error('Source Process with ID = ' + sourceId + ' does not exist');
		}
		else if (sinkIndex < 0){
			throw new Error('Sink Process with ID = ' + sinkId + ' does not exist');
		}
		else if (pipeIndex > -1){
			throw new Error('Pipe from [Process ' + sourceId + '] to [Process ' + sinkId + '] already exists');
		}
		else {
			let pipe = new Pipe(this.procs[sourceIndex], this.procs[sinkIndex]);
			this.pipes.push(pipe);
			return pipe.id;
		}
	}

	/* deletes a pipe */
	async deletePipe (pipeId){
		let index = this.pipes.findIndex(item => item.id === pipeId);
		if (index > -1){
			this.pipes.splice(index, 1);
		}
		else throw new Error('Pipe with ID = ' + pipeId + ' does not exist');
	}
}

module.exports = MockRuntime;

(async () => {
	// create a new mock runtime
	let runtime = new MockRuntime();

	// list directory 
	await runtime.listFiles('/home/ubc');

	// spawn process
	let proc0 = await runtime.spawn('/home/ubc/bin/sensor.js');

	// spawn process
	let proc1 = await runtime.spawn('/home/ubc/bin/transformer.js');

	// spawn process
	let proc2 = await runtime.spawn('/home/ubc/bin/actuator.js');

	// create pipe between 0 and 1
	await runtime.createPipe(proc0, proc1);

	// create pipe between 1 and 2
	await runtime.createPipe(proc1, proc2);

	// show processes
	let procs = await runtime.listProcesses();
	console.log(procs);

	// show pipes
	let pipes = await runtime.listPipes();
	console.log(pipes);
})();