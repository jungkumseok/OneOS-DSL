const MockRuntime = require("./runtime.js");
const Interpreter = require("../interpreter.js");
const assert = require("assert");

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

async function runTests(){
    console.log("Runing tests....");
    await testGraphDeclaration();
    console.log("All tests passed!");
}

runTests();