const readline = require("readline");
const Interpreter = require("./Interpreter.js");
const MockRuntime = require("./MockRuntime.js");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function readInput(interpreter) {
    rl.question("Enter your command: ", function (input) {
        if (input == "") {
            readInput(interpreter);
            return;
        }

        interpreter
            .eval(input)
            .then((res) => {
                for (var resElem of res) {
                    if (resElem != undefined) {
                        console.log(resElem);
                    }
                }
            })
            .catch((err) => console.log(err.toString()))
            .finally(() => {
                readInput(interpreter);
            });
    });
}

readInput(new Interpreter(new MockRuntime()));
