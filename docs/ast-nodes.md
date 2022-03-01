## AST Nodes

#### Number
```
{ type: "num", value: NUMBER }
```

#### String
```
{ type: "str", value: STRING }
```

#### Unix Command

```
{
    type: "cmd",
    cmd: CMD,
    args: []
}
```

#### Connect Command
```
{
    type: "cmd",
    cmd: CMD,
    args: [],
    graph: NAME,
}
```

#### Spawn and Node Commands
```
{
    type: "cmd",
    cmd: CMD,
    args: [],
    group: NAME,
    attrs: [],
}
```

#### List
```
{
    type: "list",
    elems: []
}
```

#### Operators (~>, ->, -*>, ~*>, ~/>, *)
```
{
    type: "op",
    operator: OPERATOR
    left: AST,
    right: AST
}
```

#### Chaining operators

Example: spawn map.js -> spawn reduce.js ~> spawn reduce.js log.txt

```

{
    type: 'op',
    operator: '~>',
    left: {
        type: 'op',
        operator: '->',
        left: {
            type: 'cmd',
            cmd: 'spawn',
            args: [ 'map.js' ],
            name: null,
            attrs: []
        },
        right: {
            type: 'cmd',
            cmd: 'spawn',
            args: [ 'reduce.js' ],
            name: null,
            attrs: []
        }
    },
    right: {
        type: 'cmd',
        cmd: 'spawn',
        args: [ 'reduce.js', 'log.txt' ],
        name: null,
        attrs: []
    }
}
```

#### Identifiers
```
{
    type: "id",
    val: NAME
}
```