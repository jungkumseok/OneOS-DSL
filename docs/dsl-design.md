# OneOS Syntax and Semantics

## Current Commands
- ls - List directories
- ps - List processes
- cd - Change directories
- pwd - Print Working Directory
- cat - Concatenate

I think continuing to base the language on Bash syntax makes sense. People using OneOS will almost certainly be familiar with Bash basics so I don't see any benefit in creating new syntax for common commands.

## Lists
Lists will be supported using JavaScript/Python-style syntax:

```
[item1, item2, item3, ...]
```

## Repeating Commands
To easily execute the same command *x* number of times, a multiplier may be specified. This is the most obviously useful for spawning multiple processes of the same type.

<pre>
x * (cmd)
</pre>

> *Kumseok:* If we plan to support arithmetic operations in our DSL, we may have to revise this syntax to disambiguate arithmetic ops. For now, I don't see much use for arithmetic ops in our DSL so I think this syntax is good.


## Spawn
The *spawn* command will be used to start processes

<pre>
spawn [options] <i>script(s)</i> [args]
</pre>


### Options
--attr <i>name(s)</i> 
- Specifies the device attributes the process needs to run.
- Examples:
```
spawn --attr "Camera" logger.js gpio1.log
spawn --attr ["Camera", "Temperature"] logger.js gpio1.log
```

> *Kumseok:* I like this idea, though I also think the `--attr` token may be redundant. Perhaps we can support something like *hashtags* or named attributes. We are essentially using this syntax to "select" nodes, similar to how we use CSS query selectors. For example:

```
spawn logger.js gpio1.log #webcam
spawn logger.js gpio1.log #webcam #temperature-sensor
spawn logger.js gpio1.log #webcam --region=vancouver
```


### Process Naming
Attaching names to a processes makes creating a graph with the *connect* command easy. More than one process can fall under the same name and references to such name will refer to the list of processes with that name.

<pre>
spawn [options] <i>script(s)</i> [args] as <i>name</i>
</pre>

Example:

```
spawn VideoRecorder.js as recorder
```


### Spawning multiple processes of the same type
<pre>
x * (spawn [options] <i>script(s)</i> [args] [as name])
</pre>

Example:

```
10 * (spawn map.js) -> 4 * (spawn reduce.js) ~> spawn reduce.js log.txt
```

## <a name="Piping"></a> Piping
*sender*: a process outputting data to one or more pipes

*receiver*: a process receiving data from one or more pipes

### One-to-One
```
sender ~> receiver

or

sender -> receiver
```

### Replicate
Data sent by the sender is replicated and sent to every receiver.

```
sender ~> [receivers]
```

### Join
Data from all senders is sent to the receiver.

```
[senders] ~> receiver
```

### Split
Data is split into a number of chunks equaling the number of receivers. Each receiver receives one of the chunks.

TODO: ordering semantics?

```
sender ~/> [receivers]
```

### Merge
Data from all senders is merged together before being forwarded to the receiver.

TODO: ordering semantics

```
[senders] ~*> receiver
```


### Pool Processing
Data from each sender is sent to any one of the receivers. For now, let's assume load balancing is attempted through round robin message passing by all senders. More complex load balancing may be required.

```
[sender(s)] -> [receivers]
```

### Many-to-Many: Replicate/Join
All data from all senders is replicated and received by every receiver.

```
[senders] ~> [receivers]
```

### Many-to-Many: Split + Join
Data from each sender is split into a number of chunks equaling the number of receivers. Each sender individually splits the chunks among the receivers.

```
[senders] ~/> [receivers]
```

### Many-to-Many: Merge + Replication
Data from all senders is merged together, replicated, and sent to every receiver.

```
[senders] ~*> [receivers]
```

### Many-to-Many: Join + Pool Processing
Data from all senders is merged together before being forwarded to one of the receivers.

```
[senders] -*> [receivers]
```

### Pipe Throughput Constraints
Ensures no more than the specified bytes per second are leaving or entering a process at a time.

```
~>{<bytes/second>}
~/>{<bytes/second>}
~*>{<bytes/second>}
->{<bytes/second>}
-*>{<bytes/second>}
```

Example:
```
spawn gpio-reader.js /dev/gpio1 ~>{10} spawn logger.js gpio1.log
```

*Kumseok:* What do you think about supporting constraints in a generic way? For example, it would be something like binding a boolean function to a stream, essentially telling the system to ensure that the function always returns true.

Example: 
```
function qos5mbs () {
	return bytes/second >= 5
}

A ~>{qos5mbs} B
```


## Connect
**Question**: Is there any benefit to having the graph specified before any processes are spawned (e.g. to better distribute the graph across devices once the structure is known)? Supporting this would require more complex syntax and semantics.

> *Kumseok:* I think there would be certain benefits, a major one being able to decouple the graph topology/structure from the exact processes. For example, if we can support defining a dataflow structure with variable names whose values can be assigned later, then we would be able to "plug in" actual programs into a graph at a later time.

The *connect* command provides a straightforward way to create graphs. Any type of piping listed under [Piping](#Piping) is supported.

<pre>
connect <i>list_of_connections</i>
</pre>

For example, the following simple graph cannot be specified by strictly using spawn command:

![diagram](./images/some-to-some.png)

Solution:
```
spawn program_A.js as "A"
spawn program_C.js as "C"

connect [A ~> C, A ~> spawn program_D.js, spawn program_B.js ~> C]
```

**Initial ideas for more flexible graph syntax/semantics:**

The *node* keyword assigns the ingrediants for starting a process (script and args) to a name. I'll call these "staged processes" for now and running processes will be "spawned processes". The *spawn_connect* keyword is used to connect together any number of staged or spawned processes, and immediately spawn any staged processes. The *connect* keyword creates a graph consisting of processes and assigns it a name. One could then use *spawn* \<graph_name\> to spawn any staged processes in the graph. This would be the same as using the connect command to connect a bunch of processes, and then spawn any staged processes one-by-one.

We would need to keep a map of names and the corresponding processes or the graph that fall(s) under them. A name can map to any number of staged and spawned processes. A name that maps to a graph can only map to that graph and nothing else. We could use the terminology "graphs" and "node groups".

To later add more processes to the graph, spawn more processes under one of the node groups involved in the graph (e.g. "A" or "C").


```
spawn program_A.js as "A"
node program_A2.js log.txt as "A"
node program_C.js as "C"

spawn_connect [A ~> C, A ~> node program_D.js, node program_B.js ~> C]

or

spawn program_A.js as "A"
node program_A2.js log.txt as "A"
node program_C.js as "C"

connect [A ~> C, A ~> node program_D.js, node program_B.js ~> C] as "graph_A"
spawn "graphA"

or

spawn program_A.js as "A"
node program_A2.js log.txt as "A"
node program_C.js as "C"
node program_D.js as "D"
node program_B as "B"

connect [A ~> C, A ~> D, B ~> C] as "graph_A"

spawn "A" // will spawn the staged process and do nothing to the already running process in the "A" node group
spawn "B"
spawn "C"
spawn "D"
```

```
// To add a few more processes to the graph sending to C and D, we can just
// spawn more processes under the node group "A"
3 * (spawn program_A.js as "A")
```

*Kumseok:* Instead of using the `spawn` expression here, what about a new keyword (e.g., `vertex`, `agent`)? The reason I suggest this is because the `spawn` expression would immediately start a process, while we may want to simply define an abstract "placeholder" process without immediately starting it until the graph is fully defined.


## Other Language Elements
These other elements have been briefly brought during discussions:

- Programming language elements:
    - Variables
    - Functions
    - Objects
    - Loops
- A "Job" abstraction.
    - A group of processes performing a task could be grouped into a "job". OneOS user's could then potentially monitor and manage graphs rather than processes.
    - Creates a clear separation between graphs.

The language currently described in this document only consists of individual commands. Kumseok has mentioned he has had to use richer programming language features like functions and objects to support the actions he needed to do.