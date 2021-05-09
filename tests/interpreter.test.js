const Interpreter = require("../interpreter/interpreter.js");
const MockRuntime = require("../interpreter/mock-runtime.js");

const windows = process.platform === "win32";

// Note: this test suit has only been tried on Windows

runNewInterpreter = async (input, testPath) => {
    let runtime = new MockRuntime();
    let interpreter = new Interpreter(runtime, null);
    testPath = testPath ? testPath : windows ? "cd ubc\\test" : "cd /ubc/test";
    await interpreter.eval(
        testPath + "\n" + (input ? input : ""),
        interpreter.environ
    );
    return [runtime, interpreter];
};

getInputStr = (cmds) => {
    var str = "";
    for (cmd of cmds) {
        str += cmd + "\n";
    }
    return str;
};

test("cd command", async () => {
    let res = await runNewInterpreter();
    let interpreter = res[1];
    expect(interpreter.environ.cwd).toBe(
        windows ? "C:\\home\\ubc\\test" : "/home/ubc/test"
    );

    await interpreter.eval("cd ..");
    expect(interpreter.environ.cwd).toBe(
        windows ? "C:\\home\\ubc" : "/home/ubc"
    );

    await interpreter.eval("cd");
    expect(interpreter.environ.cwd).toBe(windows ? "C:\\home" : "/home");
});

test("spawn a process", async () => {
    let res = await runNewInterpreter(getInputStr(["spawn program_A.js"]));
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(1);
});

test("Repeating statements 1", async () => {
    let res = await runNewInterpreter(getInputStr(["3 * spawn program_A.js"]));
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(3);
    expect((await runtime.listPipes()).length).toBe(0);
});

test("Repeating statements 2", async () => {
    let res = await runNewInterpreter(
        getInputStr(["3 * (spawn program_A.js ~> spawn program_B.js)"])
    );
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(6);
    expect((await runtime.listPipes()).length).toBe(3);
});

test("Operator Hierarchy", async () => {
    let res = await runNewInterpreter(
        getInputStr(["3 * spawn program_A.js ~> spawn program_B.js"])
    );
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(4);
    expect((await runtime.listPipes()).length).toBe(3);
});

test("node command and Node Groups", async () => {
    let res = await runNewInterpreter(
        getInputStr(['node program_A.js as "A"'])
    );
    let runtime = res[0],
        interpreter = res[1];
    expect((await runtime.listProcesses()).length).toBe(0);

    await interpreter.eval('spawn "A"');
    expect((await runtime.listProcesses()).length).toBe(1);
});

test("Creating and spawning a named graph with connect command", async () => {
    let res = await runNewInterpreter(
        getInputStr([
            'spawn program_A.js as "A"',
            'node program_A2.js log.txt as "A"',
            'node program_C.js as "C"',
            'connect [A ~> C, A ~> node program_D.js, node program_B.js as "B" ~> C] as "graph_A"',
        ])
    );
    let runtime = res[0],
        interpreter = res[1];
    expect((await runtime.listProcesses()).length).toBe(1);

    await interpreter.eval('spawn "graph_A"');
    expect((await runtime.listProcesses()).length).toBe(5);
    expect((await runtime.listPipes()).length).toBe(5);
});

test("Creating an unnamed graph with spawn commands", async () => {
    let res = await runNewInterpreter(
        getInputStr(["[spawn map.js, spawn map.js] ~> spawn reduce.js"])
    );
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(3);
    expect((await runtime.listPipes()).length).toBe(2);
});

test("Creating an unnamed graph using Node Group IDs", async () => {
    let res = await runNewInterpreter(
        getInputStr([
            'spawn program_A.js as "A"',
            'node program_C.js as "C"',
            'node program_D.js as "D"',
            'node program_B.js as "B"',
            "A ~> C",
            "A ~> D",
            "B ~> C",
        ])
    );
    let runtime = res[0],
        interpreter = res[1];
    expect((await runtime.listProcesses()).length).toBe(1);
    expect((await runtime.listPipes()).length).toBe(0);
    await interpreter.eval(
        getInputStr(['spawn "B"', 'spawn "C"', 'spawn "D"'])
    );
    expect((await runtime.listProcesses()).length).toBe(4);
    expect((await runtime.listPipes()).length).toBe(3);
});

test("Node Group edge inheritance", async () => {
    let res = await runNewInterpreter(
        getInputStr([
            'spawn program_A.js as "A"',
            'spawn program_C.js as "C"',
            'spawn program_D.js as "D"',
            'spawn program_B.js as "B"',
            "A ~> C",
            "A ~> D",
            "B ~> C",
        ])
    );
    let runtime = res[0],
        interpreter = res[1];
    expect((await runtime.listProcesses()).length).toBe(4);
    expect((await runtime.listPipes()).length).toBe(3);

    await interpreter.eval('spawn program_A.js as "A"');
    expect((await runtime.listProcesses()).length).toBe(5);
    expect((await runtime.listPipes()).length).toBe(5);
});

test("Bench PRED", async () => {
    var testPath = windows
        ? "cd C:\\home\\ubc\\bench-pred"
        : "cd /home/ubc/bench-pred";
    let res = await runNewInterpreter(
        getInputStr([
            'spawn BlobRead.js as "Reader"',
            'node DecisionTree.js as "DecisionTree"',
            '3 * (node LinearReg.js #LargeCPU as "LinearReg")',
            'node MQTTPub.js as "Publisher"',

            "connect [",
            "node MQTTSub.js ~> Reader,",
            "Reader ~> DecisionTree,",
            "Reader -> LinearReg,",
            'node Source.js ~> node Parse.js as "Parse",',
            'Parse ~> [DecisionTree, node Average.js as "Avg"],',
            "Parse -> LinearReg,",

            "[LinearReg, Avg] ~> node ErrorEstimate.js #LargeMem ~> Publisher,",
            "DecisionTree ~> Publisher,",
            "Publisher ~> node Sink.js,",
            '] as "ML-PRED"',

            'spawn "ML-PRED"',

            '2 * (spawn LinearReg.js #LargeCPU as "LinearReg")',
        ]),
        testPath
    );
    let runtime = res[0];
    console.log(await runtime.listPipes());
    expect((await runtime.listProcesses()).length).toBe(14);
    expect((await runtime.listPipes()).length).toBe(24);
});

test("Bench ETL", async () => {
    var testPath = windows
        ? "cd C:\\home\\ubc\\bench-etl"
        : "cd /home/ubc/bench-etl";
    let res = await runNewInterpreter(
        getInputStr([
            "spawn Source.js ~> spawn SenMLParse.js ~> spawn RangeFilter.js ~>",
            "spawn BloomFilter.js ~> spawn Interpolate.js ~> spawn Join.js ~>",
            "spawn Annotate.js ~> [spawn CsvToSenML.js ~> spawn MQTTPub.js, spawn AzureTableInsert.js] ~>",
            "spawn Sink.js",
        ]),
        testPath
    );
    let runtime = res[0];
    console.log(await runtime.listPipes());
    expect((await runtime.listProcesses()).length).toBe(11);
    expect((await runtime.listPipes()).length).toBe(11);
});

test("Bench STATS", async () => {
    var testPath = windows
        ? "cd C:\\home\\ubc\\bench-stats"
        : "cd /home/ubc/bench-stats";
    let res = await runNewInterpreter(
        getInputStr([
            "spawn Source.js ~> spawn SenMLParse.js ~>",
            "[",
            "spawn Average.js,",
            "(spawn KalmanFilter.js ~> spawn SlidingLinearReg.js),",
            "spawn DistinctCount.js",
            "] ~>",
            "spawn GroupViz.js ~> spawn Sink.js",
        ]),
        testPath
    );
    let runtime = res[0];
    console.log(await runtime.listPipes());
    expect((await runtime.listProcesses()).length).toBe(8);
    expect((await runtime.listPipes()).length).toBe(9);
});

test("Bench TRAIN", async () => {
    var testPath = windows
        ? "cd C:\\home\\ubc\\bench-train"
        : "cd /home/ubc/bench-train";
    let res = await runNewInterpreter(
        getInputStr([
            "spawn Source.js ~> spawn TableRead.js ~>",
            "[",
            "spawn MultiVarLinearRegTrain.js,",
            "(spawn Annotate.js ~> spawn DecisionTreeTrain.js)",
            "] ~>",
            "spawn BlobWrite.js ~> spawn MQTTPublish.js ~> spawn Sink.js",
        ]),
        testPath
    );
    let runtime = res[0];
    console.log(await runtime.listPipes());
    expect((await runtime.listProcesses()).length).toBe(8);
    expect((await runtime.listPipes()).length).toBe(8);
});

test("Bench Surveillance", async () => {
    var testPath = windows
        ? "cd C:\\home\\ubc\\bench-surveillance"
        : "cd /home/ubc/bench-surveillance";
    let res = await runNewInterpreter(
        getInputStr([
            "spawn VideoStreamer.js ~>",
            "[",
            "spawn MotionDetector.js ~>",
            "[",
            "spawn MailSender.js,",
            'spawn VideoRecorder.js as "recorder"',
            "],",
            "recorder,",
            "spawn VideoViewer.js",
            "]",
        ]),
        testPath
    );
    let runtime = res[0];
    console.log(await runtime.listPipes());
    expect((await runtime.listProcesses()).length).toBe(5);
    expect((await runtime.listPipes()).length).toBe(5);
});
