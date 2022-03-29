const MockRuntime = require("./mock-runtime.js");
const Interpreter = require("./interpreter.js");
const assert = require("assert");

async function testNodeDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = "node A = agent(python, ubc/bin/sensor.js)";
  var AST = interpreter.compile(input);
  await interpreter.evaluate(AST, interpreter.environ);
  //ensure that the node was added to the environment
  assert.equal(interpreter.environ.nodeVarMap.has("A"), true);
  assert.equal(interpreter.environ.nodeVarMap.get("A").agent, "python");
  assert.equal(
    interpreter.environ.nodeVarMap.get("A").script,
    "ubc/bin/sensor.js"
  );
}

async function testExistingNodeDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = "node A = agent(python, ubc/bin/sensor.js)";
  var AST = interpreter.compile(input);
  await interpreter.evaluate(AST, interpreter.environ);
  var input2 = "node A = agent(python, ubc/bin/sensor.js)";
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Variable name "A" already exists');
  }
}

async function testNodeNumberName() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = "node 1 = agent(python, ubc/bin/sensor.js)";
  var AST = interpreter.compile(input);
  try {
    await interpreter.evaluate(AST, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Variable name "1" is not a valid name');
  }
}

//test invalid node filepath
async function testInvalidNodeFilepath() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = "node A = agent(python, /bin/sensor.js)";
  var AST = interpreter.compile(input);
  try {
    await interpreter.evaluate(AST, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, "sensor.js does not exist");
  }
}

//test edge declaration
async function testEdgeDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)\n
  node B = agent(python, ubc/bin/sensor.js)\n
  edge C = A -> B\n;
  `;
  //split into lines
  var lines = input.split("\n");
  //remove empty lines
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }

  assert.equal(interpreter.environ.edgeVarMap.has("C"), true);
  assert.equal(interpreter.environ.edgeVarMap.get("C").sender.name, "A");
  assert.equal(interpreter.environ.edgeVarMap.get("C").receiver.name, "B");
}

//test existing edge declaration
async function testExistingEdgeDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)\n
    node B = agent(python, ubc/bin/sensor.js)\n
    edge C = A -> B;
    `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `edge C = A -> B;`;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Variable name "C" already exists');
  }
}

//test edge number name
async function testEdgeNumberName() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)\n
    node B = agent(python, ubc/bin/sensor.js)\n
    edge 1 = A -> B\n;
    `;
  //split into lines
  var lines = input.split("\n");
  //remove empty lines
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Variable name "1" is not a valid name');
  }
}

//test edge with nonexistent node
async function testEdgeWithNonexistentNode() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)\n
    node B = agent(python, ubc/bin/sensor.js)\n
    edge C = A -> B;
    `;
  //split into lines
  var lines = input.split("\n");
  //remove empty lines
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `edge C = A -> D;`;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Node "D" does not exist');
  }
}

//test edge with 3 nodes
async function testEdgeWith3Nodes() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)\n
    node B = agent(python, ubc/bin/sensor.js)\n
    node C = agent(python, ubc/bin/sensor.js)\n
    edge D = A -> B;\n
    edge E = B -> C;\n
    edge F = A -> C;\n
    `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check incoming and outgoing edges
  assert.equal(interpreter.environ.nodeVarMap.get("A").incomingEdges.length, 1);
  assert.equal(
    interpreter.environ.nodeVarMap.get("A").incomingEdges[0].name,
    "D"
  );
  assert.equal(interpreter.environ.nodeVarMap.get("A").outgoingEdges.length, 1);
  assert.equal(
    interpreter.environ.nodeVarMap.get("A").outgoingEdges[0].name,
    "F"
  );
  assert.equal(interpreter.environ.nodeVarMap.get("B").incomingEdges.length, 1);
  assert.equal(
    interpreter.environ.nodeVarMap.get("B").incomingEdges[0].name,
    "D"
  );
  assert.equal(interpreter.environ.nodeVarMap.get("B").outgoingEdges.length, 1);
  assert.equal(
    interpreter.environ.nodeVarMap.get("B").outgoingEdges[0].name,
    "E"
  );
  assert.equal(interpreter.environ.nodeVarMap.get("C").incomingEdges.length, 2);
  assert.equal(
    interpreter.environ.nodeVarMap.get("C").incomingEdges[0].name,
    "D"
  );
  assert.equal(
    interpreter.environ.nodeVarMap.get("C").incomingEdges[1].name,
    "F"
  );
  assert.equal(interpreter.environ.nodeVarMap.get("C").outgoingEdges.length, 0);
}

//test graph declaration
async function testGraphDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check graph
  assert.equal(interpreter.environ.graphVarMap.get("G").nodes.length, 2);
  assert.equal(interpreter.environ.graphVarMap.get("G").edges.length, 1);
  //check incoming and outgoing edges
  assert.equal(interpreter.environ.nodeVarMap.get("A").incomingEdges.length, 0);
  assert.equal(interpreter.environ.nodeVarMap.get("A").outgoingEdges.length, 1);
}

//check graph with nonexistent node
async function testGraphWithNonexistentNode() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> D\n;
        };
        `;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Node "D" does not exist');
  }
}

//check graph with nonexistent edge
async function testGraphWithNonexistentEdge() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge D = A -> B\n;
        };
        `;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Edge "D" does not exist');
  }
}

//check graph with invalid name
async function testGraphWithInvalidName() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `graph 1 = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Graph name "1" is not valid');
  }
}

//check duplicate graph declaration
async function testDuplicateGraphDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  var input2 = `graph G = {\n
        node A = agent(python, ubc/bin/sensor.js)\n;
        node B = agent(python, ubc/bin/sensor.js)\n;
        edge C = A -> B\n;
        };
        `;
  var AST2 = interpreter.compile(input2);
  //assert that error was thrown
  try {
    await interpreter.evaluate(AST2, interpreter.environ);
  } catch (e) {
    assert.equal(e.message, 'Graph "G" already exists');
  }
}

//create graph with no nodes
async function testGraphWithNoNodes() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `graph G = {\n
        };
        `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check graph
  assert.equal(interpreter.environ.graphVarMap.get("G").nodes.length, 0);
  assert.equal(interpreter.environ.graphVarMap.get("G").edges.length, 0);
}

//create selector declaration
async function testSelectorDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node testA = agent(python, ubc/bin/sensor.js)\n
    node testB = agent(python, ubc/bin/sensor.js)\n
    tag testA region="vancouver"\n
    selector A = region="vancouver"\n
    selector B = k=5\n
    `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check selector
  assert.equal(interpreter.environ.selectorVarMap.get("A").nodes.length, 1);
  assert.equal(interpreter.environ.selectorVarMap.get("A").nodes[0], "testA");
  assert.equal(interpreter.environ.selectorVarMap.get("B").nodes.length, 0);
}

//check invalid selector name
async function testInvalidSelectorName() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node testA = agent(python, ubc/bin/sensor.js)\n
    node testB = agent(python, ubc/bin/sensor.js)\n
    tag testA region="vancouver"\n
    selector 1 = region="vancouver"\n
    `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check selector
  assert.equal(interpreter.environ.selectorVarMap.get("1").nodes.length, 0);
}

//check duplicate selector declaration gives error
async function testDuplicateSelectorDeclaration() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node testA = agent(python, ubc/bin/sensor.js)\n
    node testB = agent(python, ubc/bin/sensor.js)\n
    tag testA region="vancouver"\n
    selector A = region="vancouver"\n
    selector A = region="vancouver"\n
    `;
  //split into lines
  var lines = input.split("\n");
  //evaluate each line
  try {
    for (var line of lines) {
      var AST = interpreter.compile(line);
      await interpreter.evaluate(AST, interpreter.environ);
    }
    //check selector
    assert.equal(interpreter.environ.selectorVarMap.get("A").nodes.length, 1);
    assert.equal(interpreter.environ.selectorVarMap.get("A").nodes[0], "testA");
  } catch (e) {
    assert.equal(e.message, 'Selector "A" already exists');
  }
}

//test spawn command with selectors
async function testSpawnCommandWithSelectors() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)
    node B = agent(python, ubc/bin/actuator.js)
    tag A type="sensor"
    tag B region="vancouver"
    tag pi-0 k=4 country="canada"
    tag pi-1 k=6
    tag pi-2 k=2
    selector nodeselector1 = region="vancouver"
    selector tagselector1 = k>5
    spawn nodeselector1 on tagselector1
    selector nodeselector2 = region="vancouver" | type="sensor"
    selector tagselector2 = k > 5 | (k < 5 & country="canada")
    spawn nodeselector2 on tagselector2`;
  //check that the nodes are spawned onto the correct hosts
  var lines = input.split("\n");
  for (var line of lines) {
    var AST = interpreter.compile(line);
    await interpreter.evaluate(AST, interpreter.environ);
  }
  //check that processes on host match the correct nodes
  assert.equal(interpreter.environ.hosts.get("pi-0").processes.length, 1);
  assert.equal(interpreter.environ.hosts.get("pi-0").processes[0].node, "A");
  assert.equal(interpreter.environ.hosts.get("pi-1").processes.length, 1);
  assert.equal(interpreter.environ.hosts.get("pi-1").processes[0].node, "B");
  assert.equal(interpreter.environ.hosts.get("pi-2").processes.length, 0);
}

//check invalid selector syntax
async function testInvalidSelectorSyntax() {
  var interpreter = new Interpreter(new MockRuntime());
  var input = `node A = agent(python, ubc/bin/sensor.js)
        node B = agent(python, ubc/bin/actuator.js)
        tag A type="sensor"
        tag B region="vancouver"
        tag pi-0 k=4 country="canada"
        tag pi-1 k=6
        tag pi-2 k=2
        selector nodeselector1 = region="vancouver"
        selector tagselector1 = k>5
        spawn nodeselector1 on tagselector1
        selector nodeselector2 = region="vancouver" | type="sensor"
        selector tagselector2 = k > 5 | ((k < 5 & country="canada")
        spawn nodeselector2 on tagselector2`;
  //check that the nodes are spawned onto the correct hosts
  var lines = input.split("\n");
  try {
    for (var line of lines) {
      var AST = interpreter.compile(line);
      await interpreter.evaluate(AST, interpreter.environ);
    }
    //check that processes on host match the correct nodes
    assert.equal(interpreter.environ.hosts.get("pi-0").processes.length, 1);
    assert.equal(interpreter.environ.hosts.get("pi-0").processes[0].node, "A");
    assert.equal(interpreter.environ.hosts.get("pi-1").processes.length, 1);
    assert.equal(interpreter.environ.hosts.get("pi-1").processes[0].node, "B");
    assert.equal(interpreter.environ.hosts.get("pi-2").processes.length, 0);
  } catch (e) {
    assert.equal(e.message, "Invalid selector syntax");
  }
}

(async () => {
  console.log("Running tests...");
  await testNodeDeclaration();
  await testExistingNodeDeclaration();
  await testNodeNumberName();
  await testEdgeDeclaration();
  await testInvalidNodeFilepath();
  await testInvalidEdgeFilepath();
  await testInvalidNodeName();
  await testInvalidEdgeName();
  await testExistingEdgeDeclaration;
  await testInvalidEdgeDeclaration();
  await testEdgeNumberName();
  await testInvalidEdgeNumberName();
  await testEdgeWith3Nodes();
  await testEdgeWithNonexistentNode();
  await testGraphDeclaration();
  await testInvalidGraphDeclaration();
  await testGraphNumberName();
  await testExistingGraphDeclaration();
  await testGraphWithNonexistentNode();
  await testGraphWithNonexistentEdge();
  await testGraphWithInvalidName();
  await testGraphWithNoNodes();
  await testSelectorDeclaration();
  await testDuplicateSelectorDeclaration();
  await testSpawnCommandWithSelectors();
  await testInvalidSelectorSyntax();
  console.log("All tests passed!");
})();
