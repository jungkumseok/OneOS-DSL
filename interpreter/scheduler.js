const MockRuntime = require("./mock-runtime.js");
const chalk = require("chalk");

// getAllRuntimes(){
//     let info = {};
//     info[this.config.id] = this.summary();
//     Object.values(this.runtimes).forEach((runtime) => {
//         info[runtime.id] = runtime;
//     });
//     return info;
// }
let runtime = new MockRuntime();
// var hosts = [new Host("p1-0")];
// let info = [];
// info.push(runtime.hosts);
// let count=0;
// for(let i=0; i<runtime.hosts.length; i++){
//     count++;
// }
let no_of_runtimes = runtime.hosts.length;
console.log(no_of_runtimes);
var ou = runtime.hosts;
console.log(ou);
// module.exports = Scheduler;