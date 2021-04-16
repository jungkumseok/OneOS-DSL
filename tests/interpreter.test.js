const Interpreter = require("../interpreter/Interpreter.js");
const MockRuntime = require("../interpreter/MockRuntime.js");

runNewInterpreter = async (input) => {
    let runtime = new MockRuntime();
    let interpreter = new Interpreter(runtime, null);
    await interpreter.eval(input, interpreter.environ);
    return [runtime, interpreter];
};

getInputStr = (cmds) => {
    var str = "";
    for (cmd of cmds) {
        str += cmd + "\n";
    }
    return str;
};

test("cd /ubc/test", async () => {
    let res = await runNewInterpreter("cd /ubc/test");
    let interpreter = res[1];
    expect(interpreter.environ.cwd).toBe("/home/ubc/test");
});

test('spawn program_A.js as "A"', async () => {
    let res = await runNewInterpreter(
        getInputStr(["cd /ubc/test", ' spawn program_A.js as "A"'])
    );
    let runtime = res[0];
    expect((await runtime.listProcesses()).length).toBe(1);
});

test('node program_A.js as "A"', async () => {
    let res = await runNewInterpreter(
        getInputStr(["cd /ubc/test", ' node program_A2.js as "A"'])
    );
    let runtime = res[0],
        interpreter = res[1];
    expect((await runtime.listProcesses()).length).toBe(0);

    await interpreter.eval('spawn "A"');
    expect((await runtime.listProcesses()).length).toBe(1);
});

test('node program_A.js as "A"', async () => {
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
    expect((await runtime.listProcesses()).length).toBe(0);

    await interpreter.eval('spawn "A"');
    expect((await runtime.listProcesses()).length).toBe(1);
});
