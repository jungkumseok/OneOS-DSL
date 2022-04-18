const MockRuntime = require("./mock-runtime.js");
const Interpreter = require("./interpreter.js");

//create interpreter and runtime, run command 100 times to measure performance
async function measureNodePerformance(numTimes) {
  var runtime = new MockRuntime();
  var interpreter = new Interpreter(runtime);
  var start = new Date().getTime();
  for (var i = 0; i < numTimes; i++) {
    var AST = interpreter.compile(
      `node A${i} = agent(node, ubc/bin/sensor.js)`
    );
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var end = new Date().getTime();
  var time = end - start;
  console.log(numtimes + "Node runs: " + time + "ms");
}

async function measureSpawnPerformance(numTimes) {
  var runtime = new MockRuntime();
  var interpreter = new Interpreter(runtime);
  var start = new Date().getTime();
  for (var i = 0; i < numTimes; i++) {
    var AST = interpreter.compile(
      `node A${i} = agent(python, ubc/bin/sensor.js)
    node B${i} = agent(python, ubc/bin/actuator.js)
    tag A${i} type${i}="sensor"
    tag B${i} region${i}="vancouver"
    tag pi-0 k${i}=4 country${i}="canada"
    tag pi-1 k${i}=6
    tag pi-2 k${i}=2
    selector nodeselector${i} = region${i}="vancouver"
    selector tagselector${i} = k${i}>5
    spawn nodeselector${i} on tagselector${i}`
    );
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var end = new Date().getTime();
  var time = end - start;
  console.log(numtimes + " Spawn runs: " + time + "ms");
}

console.log("10 node runs:");
measureNodePerformance(10);
console.log("100 node runs:");
measureNodePerformance(100);
console.log("1000 node runs:");
measureNodePerformance(1000);
console.log("10000 node runs:");
measureNodePerformance(10000);
console.log("10 spawn runs:");
measureSpawnPerformance(10);
console.log("100 spawn runs:");
measureSpawnPerformance(100);
console.log("1000 spawn runs:");
measureSpawnPerformance(1000);
console.log("10000 spawn runs:");
measureSpawnPerformance(10000);
