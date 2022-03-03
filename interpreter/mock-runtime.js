const stream = require("stream");

const windows = process.platform === "win32";

const SampleDirectory = {
  bin: {
    apt: "Package Manager",
    ls: "ListFiles",
  },
  dev: {},
  etc: {},
  home: {
    ubc: {
      bin: {
        "sensor.js": "Sensor Application",
        "actuator.js": "Actuator Application",
        "transformer.js": "Actuator Application",
      },
      test: {
        "program_A.js": "A",
        "program_A2.js": "A2",
        "program_B.js": "B",
        "program_C.js": "C",
        "program_D.js": "D",
        "gpio1.js": "",
        "logger.js": "",
        "map.js": "",
        "reduce.js": "",
      },
      "bench-pred": {
        "BlobRead.js": "",
        "DecisionTree.js": "",
        "LinearReg.js": "",
        "MQTTPub.js": "",
        "MQTTSub.js": "",
        "Source.js": "",
        "logger.js": "",
        "Parse.js": "",
        "Average.js": "",
        "ErrorEstimate.js": "",
        "Sink.js": "",
      },
      "bench-etl": {
        "Source.js": "",
        "SenMLParse.js": "",
        "RangeFilter.js": "",
        "BloomFilter.js": "",
        "Interpolate.js": "",
        "Join.js": "",
        "Annotate.js": "",
        "CsvToSenML.js": "",
        "MQTTPub.js": "",
        "AzureTableInsert.js": "",
        "Sink.js": "",
      },
      "bench-stats": {
        "Source.js": "",
        "SenMLParse.js": "",
        "Average.js": "",
        "SlidingLinearReg.js": "",
        "DistinctCount.js": "",
        "GroupViz.js": "",
        "Sink.js": "",
        "KalmanFilter.js": "",
      },
      "bench-train": {
        "Source.js": "",
        "TableRead.js": "",
        "MultiVarLinearRegTrain.js": "",
        "Annotate.js": "",
        "DecisionTreeTrain.js": "",
        "BlobWrite.js": "",
        "MQTTPublish.js": "",
        "Sink.js": "",
      },
      "bench-surveillance": {
        "VideoStreamer.js": "",
        "MotionDetector.js": "",
        "MailSender.js": "",
        "VideoRecorder.js": "",
        "VideoViewer.js": "",
      },
    },
  },
  lib: {},
  sys: {},
  usr: {},
  var: {},
};

// helper functions
function selectRandom(list) {
  return list[Math.floor(list.length * Math.random())];
}

function removeDuplicates(list) {
  return Array.from(new Set(list));
}
// end of helpers

class Host {
  constructor(id) {
    this.id = id;
    this.procs = [];
    this.tags = [];
  }

  addProcess(proc) {
    this.procs.push(proc);
  }

  addTag(tag) {
    if (!this.tags.includes(tag)) this.tags.push(tag);
    else throw new Error("Host " + this.id + " already has a tag #" + tag);
  }

  toJSON() {
    return {
      id: this.id,
      procs: this.procs.map((proc) => ({
        id: proc.id,
        host: this.id,
        program: proc.program,
        args: proc.args,
      })),
      tags: this.tags,
    };
  }
}

class Process {
  constructor(host, file, args) {
    this.id = Process.getID.next().value;
    this.host = host;
    this.program = file;
    this.args = args || [];

    this.host.addProcess(this);
  }

  setProgram(file) {
    this.program = file;
  }

  setHost(host) {
    this.host = host;
  }

  toJSON() {
    return {
      id: this.id,
      host: this.host.id,
      program: this.program,
      args: this.args,
    };
  }
}
Process.getID = (function* getID() {
  let next = 0;
  while (true) {
    yield next++;
  }
})();

class Pipe {
  constructor(source, sink) {
    this.source = source;
    this.sink = sink;
  }

  get id() {
    return this.source.id + "-" + this.sink.id;
  }
}

class File {
  constructor(name) {
    this.name = name;
    this.content = null;
  }
}

class Directory {
  constructor() {
    this.content = {};
  }

  getContent(relPath) {
    if (typeof relPath === "string") {
      let tokens = windows ? relPath.split("\\") : relPath.split("/");
      if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
        throw new Error("MockRuntime..fileExists expects a relative path");
      return this.getContent(tokens);
    } else if (relPath instanceof Array && relPath.length > 0) {
      if (this.content[relPath[0]]) {
        if (relPath.length === 1) return this.content[relPath[0]];
        else return this.content[relPath[0]].getContent(relPath.slice(1));
      } else throw new Error(relPath + " does not exist");
    } else throw new Error("Invalid argument type for Directory..getContent");
  }

  listContent() {
    return Object.keys(this.content).map((key) => ({
      name: key,
      type: this.content[key] instanceof Directory ? "directory" : "file",
    }));
  }
}
Directory.fromJSON = (data) => {
  return Object.keys(data).reduce((dir, key) => {
    if (typeof data[key] === "object") {
      dir.content[key] = Directory.fromJSON(data[key]);
    } else {
      dir.content[key] = new File(key);
    }
    return dir;
  }, new Directory());
};

class MockRuntime {
  constructor() {
    this.hosts = [
      new Host("pi-0"),
      new Host("pi-1"),
      new Host("pi-2"),
      new Host("pi-3"),
      new Host("pi-4"),
    ];
    this.root = Directory.fromJSON(SampleDirectory);
    this.procs = [
      new Process(this.hosts[0], "video-streamer.js", ["/dev/video0"]),
      new Process(this.hosts[1], "video-streamer.js", ["/dev/video0"]),
      new Process(this.hosts[2], "video-streamer.js", ["/dev/video0"]),
      new Process(this.hosts[3], "video-recorder.js", [
        "/home/ubc/data/video-pi-0",
      ]),
      new Process(this.hosts[4], "video-recorder.js", [
        "/home/ubc/data/video-pi-1",
      ]),
      new Process(this.hosts[2], "video-recorder.js", [
        "/home/ubc/data/video-pi-2",
      ]),
    ];
    this.pipes = [
      new Pipe(this.procs[0], this.procs[3]),
      new Pipe(this.procs[1], this.procs[4]),
      new Pipe(this.procs[2], this.procs[5]),
    ];
  }

  /* checks if the file exists */
  async fileExists(absPath) {
    if (typeof absPath === "string") {
      let tokens = windows ? absPath.split("\\") : absPath.split("/");
      if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
        throw new Error("MockRuntime..fileExists expects an absolute path");
      let item = this.root.getContent(tokens.slice(1));
      if (item instanceof File) return;
      else throw new Error("File doesn't exist: ", absPath);
    } else throw new Error("Invalid argument type for MockRuntime..fileExists");
  }

  /* checks if the directory exists */
  async directoryExists(absPath) {
    if (typeof absPath === "string") {
      let tokens = windows ? absPath.split("\\") : absPath.split("/");
      if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
        throw new Error("MockRuntime..fileExists expects an absolute path");
      let item = this.root.getContent(tokens.slice(1));
      if (item instanceof Directory) return;
      else throw new Error("Directory doesn't exist: ", absPath);
    } else
      throw new Error("Invalid argument type for MockRuntime..directoryExists");
  }

  /* equivalent to the unix `ls` command */
  async listFiles(absPath) {
    if (typeof absPath === "string") {
      let tokens = windows ? absPath.split("\\") : absPath.split("/");
      if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
        throw new Error("MockRuntime..fileExists expects an absolute path");
      let item = this.root.getContent(tokens.slice(1));
      if (item instanceof Directory) return item.listContent();
      else return [{ name: item.name, type: "file" }];
    } else throw new Error("Invalid argument type for MockRuntime..listFiles");
  }

  /* equivalent to the unix `ps` command */
  async listProcesses() {
    return this.procs;
  }

  /* returns a list of pipes (unix equivalent doesn't exist) */
  async listPipes() {
    // return this.pipes;
    var strArr = [];
    for (var pipe of this.pipes) {
      strArr.push(`${pipe.source.program.name} ~> ${pipe.sink.program.name}`);
    }
    return strArr;
  }

  /* returns a list of hosts (unix equivalent doesn't exist) */
  async listHosts() {
    return this.hosts;
  }

  /* returns a list of hosts (unix equivalent doesn't exist) */
  async findHostsByTag(tag, ...moreTags) {
    let hosts;
    if (tag instanceof Array && tag.length > 0) {
      hosts = this.hosts.filter((host) =>
        tag.reduce((acc, item) => acc && host.tags.includes(item), true)
      );
    } else if (typeof tag === "string") {
      hosts = this.hosts.filter((host) => host.tags.includes(tag));
    } else
      throw new Error("Invalid argument type for MockRuntime..findHostsByTag");

    if (moreTags.length > 1) {
      let moreHosts = await this.findHostsByTag(moreTags[0], moreTags.slice(1));
      return removeDuplicates(hosts.concat(moreHosts));
    } else if (moreTags.length === 1) {
      let moreHosts = await this.findHostsByTag(moreTags[0]);
      return removeDuplicates(hosts.concat(moreHosts));
    }
    return removeDuplicates(hosts);
  }

  /* starts a new process */
  // TODO: only spawn on devices that have all the matching tags
  async spawn(agentAbsPath, args, ...tags) {
    if (typeof agentAbsPath === "string") {
      let tokens = windows ? agentAbsPath.split("\\") : agentAbsPath.split("/");
      if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
        throw new Error("MockRuntime..fileExists expects an absolute path");
      let item = this.root.getContent(tokens.slice(1));
      // console.log(item);
      if (item instanceof File) {
        let host = selectRandom(this.hosts);
        let proc = new Process(host, item, args);
        this.procs.push(proc);

        return proc.id;
      } else throw new Error("Cannot spawn a directory");
    } else throw new Error("Invalid argument type for MockRuntime..spawn");
  }

  /* kills a process */
  async kill(pid) {
    let index = this.procs.findIndex((item) => item.id === pid);
    if (index > -1) {
      this.procs.splice(index, 1);
    } else throw new Error("Process with ID = " + pid + " does not exist");
  }

  /* Checks if a process exists */
  async processExists(pid) {
    let index = this.procs.findIndex((item) => item.id === pid);
    return index > -1;
  }

  /* creates a new pipe between 2 processes */
  async createPipe(sourceId, sinkId) {
    let id = sourceId + "-" + sinkId;

    let sourceIndex = this.procs.findIndex((item) => item.id === sourceId);
    let sinkIndex = this.procs.findIndex((item) => item.id === sinkId);

    let pipeIndex = this.pipes.findIndex((item) => item.id === id);

    if (sourceIndex < 0) {
      throw new Error(
        "Source Process with ID = " + sourceId + " does not exist"
      );
    } else if (sinkIndex < 0) {
      throw new Error("Sink Process with ID = " + sinkId + " does not exist");
    } else if (pipeIndex > -1) {
      throw new Error(
        "Pipe from [Process " +
          sourceId +
          "] to [Process " +
          sinkId +
          "] already exists"
      );
    } else {
      let pipe = new Pipe(this.procs[sourceIndex], this.procs[sinkIndex]);
      this.pipes.push(pipe);
      return pipe.id;
    }
  }

  /* deletes a pipe */
  async deletePipe(pipeId) {
    let index = this.pipes.findIndex((item) => item.id === pipeId);
    if (index > -1) {
      this.pipes.splice(index, 1);
    } else throw new Error("Pipe with ID = " + pipeId + " does not exist");
  }

  /* Checks if a pipe exists */
  async pipeExists(sourceId, sinkId) {
    let id = sourceId + "-" + sinkId;
    let pipeIndex = this.pipes.findIndex((item) => item.id === id);
    return pipeIndex > -1;
  }
}

module.exports = MockRuntime;

// (async () => {
//  // create a new mock runtime
//  let runtime = new MockRuntime();

//  // list directory
//  let hosts = await runtime.listHosts('/home/ubc');

//  console.log(hosts);

//  hosts[0].addTag('sensor');
//  hosts[1].addTag('sensor');
//  hosts[4].addTag('sensor');

//  hosts = await runtime.findHostsByTag('sensor');
//  console.log(hosts);

//  runtime.hosts[0].addTag('actuator');
//  runtime.hosts[4].addTag('actuator');
//  hosts = await runtime.findHostsByTag(['sensor', 'actuator']);

//  runtime.hosts[3].addTag('compressor');

//  hosts = await runtime.findHostsByTag(['sensor', 'actuator'], 'compressor', 'sensor');
//  console.log(hosts);
// })();
