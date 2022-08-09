# Interpreter Design

## Overview
This design document highlights the overall structure and some of the design decision that went into creating the first draft of the interpreter for the new [OneOS](https://github.com/DependableSystemsLab/OneOS) DSL. The core structure for the interpreter was based off of this [JavaScript Interpreter Tutorial](http://lisperator.net/pltut). See the [DSL Design Document](./dsl-design.md) for an overview of the language.

Several files make up the interpreter and they have following hierarchy:

![File Hierarchy](./images/file-hierarchy.png)

The new OneOS DSL is a simple command-based language. There is not currently a need for typical programming language elements like general-purpose variables, functions, and loops. Therefore, the interpreter is more of a command-line interpreter right now, but it's structured so that it can be easily extended to handle complex programming language concepts.

Like many interpreters, the input-stream is separated in tokens which are then forwarded to the parser. The parser builds an abstract syntax tree (AST) that represents the semantics of the user's input which is then evaluated.

## User Interface
The command interface (*cmd-interface.js*) provides a simple interface for entering DSL statements. After each statement, the user hits enter and the statement is parsed and evaluated. Similar to a language like Python, statements are separated by new-line characters so each statement must be entered separately.

To easily run a series of OneOS DSL statements for testing purposes, there is a *tester.js* script that reads from a OneOS DSL script file located on the local machine. The script file must store the statements in plain text.

In the future, it would be good to add a command for running OneOS DSL scripts stored in the OneOS file system.

## The Interpreter
Before getting into the individual components, it is important to note the high-level structure of the Interpreter. The Interpreter has an *environment* that maintains all state. For a typical programming language, the environment would hold the variable bindings and keep track of the context in which statements are executed. Since we don't support traditional variables, the main state in the environment is two global lists of [Node Groups](./dsl-design.md#Node-Groups) and [Graphs](./dsl-design.md#Graphs).

The OneOS runtime API is passed to the Interpreter when it is created and is primarily used by the Evaluator/Spawner to create processes and pipes between processes.

There are also a number of "built-in" commands that are logically separated from the OneOS DSL: echo, pwd, cd, ps, ls, and ls_pipes. These commands are supported directly by the OneOS operating system and don't need to be evaluated in the interpreter. If the Evaluator does not recognize a command, it will check to see if it's supported by the external environment.

TODO: add better explanation for why these should be separated. 

### Input Stream
The Input Stream is a simple object used by the Token Stream to peek or fetch the next characters of the user input.

### Token Stream
The Token Stream takes the Input Stream and separates it into basic syntax elements. There are several token types: strings, numbers, commands, punctuation, key words, attributes, new lines, operators, and words.

#### Strings and Numbers
Strings are deliminated by double or single quotations. A number is any series of one or more digits.

#### Commands
There are currently four commands supported by the interpreter: *spawn*, *node*, *connect*, and *spawn_connect*. All other commands such as *ps*, *ls* and *ls_pipes* are "built-ins" supported externally that the interpreter is unaware of.

#### Punctuation
The following five characters have meaning in the language: *()[],*. Parentheses can be used along with the *\** operator to [repeat statements](./dsl-design.md#Repeating-Statements) multiple times. Square brackets are used to deliminate [Lists](./dsl-design.md#Lists) and commas separate the list elements.

#### Key Words
There is a single keyword *as* that is often used along with *spawn*, *node* and *connect* commands to assign a name/identifier to the resulting [Node](./dsl-design.md#Nodes) or [Graph](./dsl-design.md#Graphs).

```
node example.js as "NodeGroup1"
```

#### Device Attributes (aka Tags)
Attributes are identified by a hash symbol (#) prefix. See the *Tags* section of the [DSL Design Document](./dsl-design.md#Tags) for their use cases.

#### New Line
Each new line character is a separate token and these tokens are used by the Parser to separate statements.

#### Operators
There are five [Piping](./dsl-design.md#Piping) operators: **~>**, **->**, **-\*>**, **~\*>**, and **~/>**. The only other operator is the asteriks (\*) that is used to [repeat statements](./dsl-design.md#Repeating-Statements) and takes precedence over the piping operators. In the example below, the order of precedence ensures that three processes running BlobRead.js pipe their output to a single process running Sink.js, rather than three BlobRead.js processes each piping their output to a separate Sink.js process (this can be achieved with parentheses).

```
3 * spawn BlobRead.js ~> spawn Sink.js
```

```
3 * (spawn BlobRead.js ~> spawn Sink.js)
```

#### Words
A *word* is admittedly a very vague term that is used to describe any other series of characters. Words are separated from other words, commands, and key words with space characters. The Interpreter can't reject unknown series of characters since they may be the arguments in a *node* or *spawn* command that will be passed to the script run by the resulting process. For example, the *spawn* statement below will launch a process that runs *logger.js* with "./output/log.txt" as the argument to the script.
```
spawn logger.js ./output/log.txt
```
Furthermore, the Interpreter is not aware of the built-in commands such as *ps*, *ls*, and *ls_pipes*.

### Parser
The Parser receives the Token Stream and creates an AST that represents the semantics of the user input. The AST node types can be found in the [AST Nodes Document](./ast-nodes.md) and consist of *num*, *str*, *cmd*, *op*, and *id*. The *cmd* node type encapsulates all commands including "unknown" commands. The parser assumes a *word* token is an unknown command when it is the first token of a new statement. The Evaluator will eventually check if the environment injected into the interpreter supports the command and will return an error to the user if not. There was discussion about having a separate AST node type for each internally supported command (*spawn*, *node*, *connect/spawn_connect*) but I have left them all grouped under the *cmd* AST node type. It made more sense to me to logically group every command together under one type but it may need to be reconsidered in the future.

The *id* token type is unique because it only appears right before or after a piping operator token. The DSL does not have variables in the traditional programming language sense, but it has named [Node Groups](./dsl-design.md#Node-Groups) that can pipe to or from other Node Groups or [Nodes](./dsl-design.md#Nodes). If there is a single *word* on either side of a piping operator, it is assumed to be the name of a Node Group.

### Evaluator
The Evaluator evaluates the expressions encoded in the AST and carries out the corresponding functionality defined in the [DSL Design Document](./dsl-design.md). The *evaluate* function is asynchronous because it makes asynchronous calls to the Spawner and OneOS runtime.

#### Data Structures
There are four key data structures (defined in *[structures.js](../interpreter/structures.js)*) that are created during evaluation: Node, Edge, Graph, and NodeGroup. There purpose of each structure is defined in the [Terminology](./dsl-design.md#Terminology) section of the DSL Design Document.

#### State
As Node Groups and [Graphs](./dsl-design.md#Node-Groups) are created and modified, their state is maintained in the *environment* so that they can be referenced in future invocations of the Evaluator. My initial thoughts were to have these Graphs and Node Groups maintained in the OneOS runtime. I was envisioning eventually having the ability to view and modify the Graphs via the OneOS web interface. Once all the graphs are spawned, the runtime is implicitly storing the same information wherever it keeps track of the processes and pipes. The only difference is the interpreter associates names with groups of pipes (Graphs) and groups of Nodes (Node Groups).

### Spawner
The Evaluator does not create any new pipes or processes in the runtime until it's gone through the entire AST. The Evaluator queues up Nodes that need to be spawned and new Edges between already spawned Nodes while traversing the AST. At the end, the two queues are passed to the Spawner which makes API calls to the OneOS runtime to create processes for Nodes and pipes for the Edges. The Spawner automatically creates pipes for any Edges between a newly spawned Node and other spawned Nodes

The motivation for waiting until the entire AST has been evaluated before updating the runtime is to be able to run an algorithm to intelligently organize the processes amongst devices. Right now, the Spawner can be thought of as a dumb version of this algorithm that makes a call to the runtime to spawn each process separately. I believe the algorithm will ultimately reside in the OneOS runtime, so there will need to be some way to pass the information stored in the queue of Nodes to the runtime all at once. Maybe the runtime will need to become aware of the Node and Edge data structures or there will need to be some other common graph-like data structure.

## Future Work
- **Format User Output**: The output to the user is very crude. The Evaluator is recursive and returns the result of each expression which means internal data structures are returned to the user at the top-level. For example, a *connect* command will return a Graph data structure that results from its evaluation which the Command Interface then prints for the user. The output from external commands *ls*, *ps*, and *ls_pipes* also needs formatting.
- **Process and Pipe Management**: The user uses the OneOS DSL to create processes and pipes. Later, the user may want to kill some of the processes or pipes or maybe manually migrate some of the processes to new devices. Based on my understanding from working with the Mock Runtime, the user would have to do some detective work with *ps* and *ls_pipes* to figure out which process is which. I think it will be important for the user to be able to access the Graph data structures in some form. A command could be added to fetch all the the processes and pipes associated with a given graph name. A kill command could be added for graphs if the user wanted to kill all the processes in the graph. Another very user-friendly way would be viewing and managing the graphs in the web UI.
- **Running Scripts**: A command should be added to run DSL scripts stored in the OneOS file system
- **Support More External Commands**: Right now, the only "built-ins" that are really supported are *ps*, *ls*. *pwd*, *cd*, *echo*, and *ls_pipes*. The old interpreter has many more like *mkdir*, *cat*, etc. Since the interpreter structure is very similar, I think it will be possible to simply copy them over for the most part.