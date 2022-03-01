const MockRuntime = require("./mock-runtime.js");
const Interpreter = require("./interpreter.js");

const fs = require("fs");
const input = fs
    .readFileSync("./interpreter/TestData/bench-surveillance.txt")
    .toString("utf-8");

// var inputStream = InputStream(input);
// var tokenStream = TokenStream(inputStream);

// while ((token = tokenStream.next()) != null) {
//     console.log(token)
// }

// var AST = parse(tokenStream);
// console.log("AST:");
// console.log(AST);
// console.log();

// console.log(AST.prog[0].args[0]);
// console.log(AST.prog[0].args[0].elems);

// console.log(AST.prog[0])
// console.log(AST.prog[0].args[0].elems)

// console.log(AST.prog[0].args[0].elems[0].left)
// console.log(AST.prog[0].args[0].elems[0].right)

// console.log(AST.prog[0].left)
// console.log(AST.prog[0].right)

(async () => {
    var interpreter = new Interpreter(new MockRuntime());
    var AST = interpreter.compile(input);

    await interpreter.evaluate(AST, interpreter.environ);

    console.log("DONE EVALUATING");

    console.log("Graphs:");
    console.log(interpreter.environ.Graphs);

    console.log("Node Groups:");
    console.log(interpreter.environ.NodeGroups);

    // console.log("\nGraphs:");
    // for (var graph_name in interpreter.environ.Graphs) {
    //     console.log(`\n"${graph_name}":`);
    //     interpreter.print_graph(interpreter.environ.Graphs[graph_name]);
    // }

    console.log("\nNode Groups:");
    for (var name in interpreter.environ.NodeGroups) {
        console.log(`\n"${name}":`);
        interpreter.print_node_group(interpreter.environ.NodeGroups[name]);
    }
})();
