const stream = require("stream");
const pidusage = require("pidusage");
const Node = require("../structures");
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
            "observer.js": "Vide Streamer Application",
            "detector.js": "Motion Detector Apllication",
            "recorder.js": "Video Recorder Application",
            "viewer.js": "Video Viewer Application",
            "mail_sender.js": "Mail Sender Application", 
          },
        },
    },
    lib: {},
    sys: {},
    usr: {},
    var: {},
  };
  // helper functions
function selectRandom(list) { // need to fix this there is no need to declare random hosts.
    return list[Math.floor(list.length * Math.random())];
  }
  class Host {
    constructor(id) {
      this.id = id;
      this.procs = [];
      this.tags = {};
      // this.limit_memory = 512;
    }
  
    addProcess(proc) {
      this.procs.push(proc);
    }
  
  addProcess(proc) {
    this.procs.push(proc);
  }
  // addTag(tag) {
  //   if (!this.tags.includes(tag)) this.tags.push(tag);
  //   else throw new Error("Host " + this.id + " already has a tag #" + tag);
  // }

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
// class Process {
//   constructor(host, file, args) {
//     this.id = Process.getID.next().value;
//     this.host = host;
//     this.program = file;
//     this.args = args || [];

//     this.host.addProcess(this);
//   }

//   setProgram(file) {
//     this.program = file;
//   }

//   setHost(host) {
//     this.host = host;
//   }

//   toJSON() {
//     return {
//       id: this.id,
//       host: this.host.id,
//       program: this.program,
//       args: this.args,
//     };
//   }
// }
// Process.getID = (function* getID() {
//   let next = 0;
//   while (true) {
//     yield next++;
//   }
// })();

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

class Runtime {
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
      ];
      this.pipes = [
        /*new Pipe(this.procs[0], this.procs[3]),
        new Pipe(this.procs[1], this.procs[4]),
        new Pipe(this.procs[2], this.procs[5]),*/
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
    // async listHosts() {
    //   return this.hosts;
    // }
  
    /* starts a new process */
    //TODO: only spawn on devices that have all the matching tags
    // async spawn(agentAbsPath, args, hostnames) {
    //   if (typeof agentAbsPath === "string") {
    //     let tokens = windows ? agentAbsPath.split("\\") : agentAbsPath.split("/");
    //     if ((!windows && tokens[0] !== "") || (windows && tokens[0] !== "C:"))
    //       throw new Error("MockRuntime..fileExists expects an absolute path");
    //     let item = this.root.getContent(tokens.slice(1));
    //     console.log(item);
    //     if (item instanceof File) {
    //       let host;
    //       if (hostnames) {
    //         var hostname = selectRandom(hostnames);
    //         host = this.hosts.find((host) => host.id === hostname);
    //       } else {
    //         host = selectRandom(this.hosts);
    //       }
    //       let proc = new process(host, item, args);
    //       // let proc =  Node(item, , host);
          
    //       let new_id = proc.id
    //       this.procs.push(proc);
    //         for(let i=0;i<this.procs.length; i++){
    //           console.log(this.procs[i]);
    //         }
          // const stats = await pidusage(new_id);
          // console.log(stats);
          
          
          //  pidusage(proc.id, function (err, stats) {
          //   console.log(stats)
          // })
    //       return proc.id;
          
    //     } else throw new Error("Cannot spawn a directory");
    //   } else throw new Error("Invalid argument type for MockRuntime..spawn");
    // }
   
  
    // /* kills a process */
    // async kill(pid) {
    //   let index = this.procs.findIndex((item) => item.id === pid);
    //   if (index > -1) {
    //     this.procs.splice(index, 1);
    //   } else throw new Error("Process with ID = " + pid + " does not exist");
    // }
  
    

}
  
module.exports = Runtime;