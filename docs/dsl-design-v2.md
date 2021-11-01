## Dataflow Graph

### `graph`: GraphDeclaration

Usage example:

```
graph PersistentEncryptor {
	node encrypt = agent('es6', 'encrypt.js')
	node logger = agent('py3', 'logger.py')

	in:0 -> encrypt
	edge enc2log = encrypt -> logger
	logger -> out:0
}
```

### `node`: NodeDeclaration

Usage example:

```
node encrypt = agent('node', 'encrypt.js')
```

### `edge`: EdgeDeclaration

Usage example:

```
edge enc2log = encrypt -> logger
```


### `policy`: PolicyDeclaration

Usage example:

```
policy RealTimePolicy for PersistentEncryptor {
	selector highPerf = host => host.cores > 2

	graph.encrypt @ highPerf
}
```