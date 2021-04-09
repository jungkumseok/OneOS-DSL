### `MockRuntime.js` API


* **(constructor)** `MockRuntime()`

Creates a new `MockRuntime` instance.

*Example*
```
let runtime = new MockRuntime()
```


* (async method) `runtime.spawn(absolutePath)`

Runs an executable at the given `absolutePath` string. Returns a number indicating the PID of the newly created process. Throws error if there is no file at the given `absolutePath`.

*Example*
```
let pid = await runtime.spawn('/home/ubc/bin/sensor.js')
```


* (async method) `runtime.kill(pid)`

Kills the process with the given `pid` (number). Throws error if there is no process with the given `pid`.

*Example*
```
await runtime.kill(1234)
```


* (async method) `runtime.createPipe(sourceId, sinkId)`

Creates a pipe from the process with PID = `sourceId` to the process with PID = `sinkId`. Returns a string indicating the ID of the newly created pipe. Throws error if the pipe already exists, or if either the source or the sink process does not exist.

*Example*
```
let pipeId = await runtime.createPipe(1234, 5678)
```


* (async method) `runtime.deletePipe(pipeId)`

Removes the pipe with the given `pipeId` (string). Throws error if there is no pipe with the given `pipeId`.

*Example*
```
await runtime.deletePipe('1234-5678')
```
