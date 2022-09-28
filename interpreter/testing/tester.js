const MockRuntime = require("./runtime.js");
const Interpreter = require("../interpreter.js");
const assert = require("assert");
const expect = require('expect');

const windows = process.platform === "win32";

async function testGraphDeclaration(){
    var interpreter = new Interpreter(new MockRuntime());
    var input = `graph G {\n
            node A = agent(python, ubc/bin/observer.js)\n
            node B = agent(python, ubc/bin/detector.js)\n
            node C = agent(python, ubc/bin/recorder.js)\n
            node D = agent(python, ubc/bin/viewer.js)\n
            node E = agent(python, ubc/bin/mail_sender.js)\n
            edge F = A -> B\n
            edge G = A -> C\n
            edge H = A -> D\n
            edge I = B -> E\n
            edge J = B -> C\n
    }
    `; 
    var lines = input.split("\n");
    for(var line of lines){
        var AST = interpreter.compile(line);
        await interpreter.evaluate(AST, interpreter.environ);
    }
    //check graph
  assert.equal(interpreter.environ.graphVarMap.get("G").edges.length, 5);
  //check incoming and outgoing edges
  assert.equal(interpreter.environ.nodeVarMap.get("A").in_edges.length, 0);
  assert.equal(interpreter.environ.nodeVarMap.get("A").out_edges.length, 3);
  assert.equal(interpreter.environ.nodeVarMap.get("B").in_edges.length, 1);
  assert.equal(interpreter.environ.nodeVarMap.get("B").out_edges.length, 2);
}
// runNewInterpreter = async (input, testPath) => {
//     let runtime = new MockRuntime();
//     let interpreter = new Interpreter(runtime, null);
//     testPath = testPath ? testPath : windows ? "cd ubc\\bin" : "cd /ubc/bin";
//     await interpreter.eval(
//         testPath + "\n" + (input ? input : ""),
//         interpreter.environ
//     );
//     return [runtime, interpreter];
// };
// getInputStr = (cmds) => {
//     var str = "";
//     for (cmd of cmds) {
//         str += cmd + "\n";
//     }
//     return str;
// };


// async function testy(){
    // test("Creating and spawning a named graph with spawn_connect command", async () => {
        // let res = await runNewInterpreter(
        //     getInputStr([
        //         `graph G {\n
        //             node A = agent(python, observer.js)\n
        //             node B = agent(python, detector.js)\n
        //             node C = agent(python, recorder.js)\n
        //             node D = agent(python, viewer.js)\n
        //             node E = agent(python, mail_sender.js)\n
        //             edge F = A -> B\n
        //             edge G = A -> C\n
        //             edge H = A -> D\n
        //             edge I = B -> E\n
        //             edge J = B -> C\n
        //     }
        //     `
                // 'spawn obbserver.js as "A"',
                // 'node program_A2.js log.txt as "A"',
                // 'node program_C.js as "C"',
                // 'spawn_connect [A ~> C, A ~> node program_D.js, node program_B.js as "B", B ~> C,]',
        //     ])
        // );
        // let runtime = res[0];
        // expect((await runtime.listProcesses()).length).toBe(0);
        // expect((await runtime.listPipes()).length).toBe(0);
    // });
// }

async function runTests(){
    console.log("Runing.");
    await testGraphDeclaration();
    // await testy();
    console.log("Test passed!");
}

runTests();