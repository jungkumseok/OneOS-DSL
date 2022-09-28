const Spawner = require("./spawner.js");
const path = require("path");
const processString = require("./processString.js");
const pidusage = require('pidusage')

const MockRuntime = require("./mock-runtime.js");
const process = MockRuntime.Process;

const structures = require("./structures.js");
const e = require("express");
const { css_beautify } = require("js-beautify");
const Node = structures.Node;
const Edge = structures.Edge;
const Graph = structures.Graph;
const NodeGroup = structures.NodeGroup;
const Selector = structures.Selector;

function is_node_group(env, name) {
  return env.NodeGroups[name] != undefined;
}

function is_graph(env, name) {
  return env.Graphs[name] != undefined;
}

function is_piping_op(exp) {
  var pipes = " -> -*> ~> ~/> ~*> ";
  return exp.type == "op" && pipes.includes(" " + exp.operator + " ");
}

function get_edge(sender, receiver, pipe) {
  for (var edge of sender.out_edges) {
    if (edge.receiver == receiver && edge.pipe == pipe) {
      return edge;
    }
  }
  return null;
}

function add_node_to_group(env, name, nd) {
  if (env.NodeGroups[name] == undefined) {
    env.NodeGroups[name] = new NodeGroup(name);
  }
  nd.group = env.NodeGroups[name];
  env.NodeGroups[name].nodes.push(nd);
}

function get_node_group(env, name) {
  var group = env.NodeGroups[name];
  if (group == undefined) {
    throw new Error(`No node group named \"${name}\"`);
  }
  return group;
}

function spawn_node_group(env, group) {
  // Spawn each node that has not been spawned
  for (var nd of group.nodes) {
    if (nd.pid == null) {
      env.nodeSpawnQueue.add(nd);
    }
  }
}

function spawn_graph(env, graph) {
  /* Spawns any staged nodes in the graph. Pipes are automatically created by the Spawner between
   * edges consisting of at least one staged node when the node is spawned. */
  for (var edge of graph.edges) {
    var senders =
      edge.sender instanceof NodeGroup ? edge.sender.nodes : [edge.sender];
    var receivers =
      edge.receiver instanceof NodeGroup
        ? edge.receiver.nodes
        : [edge.receiver];
    for (var sender of senders) {
      for (var receiver of receivers) {
        // Explictly create edges if both nodes are spawned.
        if (sender.pid != null && receiver.pid != null) {
          env.edgeSpawnQueue.add(new Edge(sender, receiver));
        } else {
          if (sender.pid == null) {
            env.nodeSpawnQueue.add(sender);
          }
          if (receiver.pid == null) {
            env.nodeSpawnQueue.add(receiver);
          }
        }
      }
    }
  }
}

function spawn_node(env, nd) {
  env.nodeSpawnQueue.add(nd);
}

function spawn_edge(env, edge) {
  env.edgeSpawnQueue.add(edge);
}

function verify_script_exists(env, cmd, first_arg) {
  var arg_val = first_arg.value;
  if (first_arg.type == "num") {
    throw new Error(
      `Invalid first argument \"${arg_val}\": \"${cmd}\" command needs a *.js or *.py file as the first argument`
    );
  }
  var file_types = " .js  .py ";
  if (file_types.indexOf(arg_val.substr(arg_val.length - 3)) < 0) {
    throw new Error(
      `Invalid file \"${arg_val}\": \"${cmd}\" command needs a *.js or *.py file as the first argument`
    );
  } else {
    // Check the file exists
    env.verifs.push(env.api.fileExists(path.resolve(env.cwd, arg_val)));
  }
}

function get_args(args_arr) {
  return args_arr.map((arg) => arg.value);
}

function* numberGen(){
  let i =0; 
  while(true){
    yield i++;
  }
}
const gen = numberGen();

function create_node(env, exp, spawn) {
  if (spawn == true) {
    var first_arg = exp.args[0];
    verify_script_exists(env, cmd, first_arg);

    var file_name = first_arg.value;
    var args = get_args(exp.args.slice(1));
    var nd = new Node(file_name, args, exp.attrs);
    env.nodeSpawnQueue.add(nd);
    return;
  }
  console.log(env);
  console.log(exp);
  if (
    exp.args.length != 4 ||
    !exp.args[2].value.startsWith("agent") ||
    !exp.args[2].value.endsWith(",") ||
    !exp.args[3].value.endsWith(")") ||
    exp.args[1].value != "="
  ) {
    throw new Error(`Invalid arguments, not a valid agent`);
  }
  exp.args[3].value = exp.args[3].value.substring(
    0,
    exp.args[3].value.length - 1
  );
  var fourth_arg = exp.args[3];
  verify_script_exists(env, cmd, fourth_arg);

  var file_name = fourth_arg.value;
  var agent_name = exp.args[2].value.substr(6, exp.args[2].value.length - 7);
  let host_name = env.api.hosts[Math.floor(env.api.hosts.length * Math.random())];
 
 
  // pidusage(nd.pid, function (err, stats) {
  //   console.log(stats);
    // cb();
  // })

  if (
    env.nodeVarMap.has(exp.args[0].value) ||
    env.edgeVarMap.has(exp.args[0].value)
  ) {
    throw new Error(`Variable name \"${exp.args[0].value}\" already exists`);
  } 
  var nd = new Node(file_name, exp.args[0].value, agent_name, host_name);
  nd.pid = gen.next().value;
  // const stats = pidusage(nd.pid)
  // console.log(stats);
  console.log(nd.pid);

  env.nodeVarMap.set(exp.args[0].value, nd);
  return nd;
}

function create_edge(env, exp) {
  if (
    exp.args.length != 5 ||
    exp.args[1].value != "=" ||
    exp.args[3].value != "->"
  ) {
    throw new Error(`Invalid arguments, not a valid agent`);
  }
  if (!env.nodeVarMap.has(exp.args[2].value)) {
    throw new Error(`No node named \"${exp.args[2].value}\"`);
  }

  if (!env.nodeVarMap.has(exp.args[4].value)) {
    throw new Error(`No node named \"${exp.args[4].value}\"`);
  }
  if (
    env.nodeVarMap.has(exp.args[0].value) ||
    env.edgeVarMap.has(exp.args[0].value)
  ) {
    throw new Error(`Variable name \"${exp.args[0].value}\" already exists`);
  }
  var edge = new Edge(
    env.nodeVarMap.get(exp.args[2].value),
    env.nodeVarMap.get(exp.args[4].value),
    exp.args[3].value
  );
  env.edgeVarMap.set(exp.args[0].value, edge);
  env.nodeVarMap.get(exp.args[2].value).out_edges.push(edge);
  env.nodeVarMap.get(exp.args[4].value).in_edges.push(edge);
  if (env.graphStack.length > 0) {
    //get last element of graphStack
    var graph = env.graphStack[env.graphStack.length - 1];
    graph.edges.push(edge);
  }
}

function create_selector(env, exp) {
  if (exp.args.length < 3 || exp.args[1].value != "=") {
    throw new Error(`Invalid arguments, not a valid selector`);
  }
  if (env.selectorVarMap.has(exp.args[0].value)) {
    throw new Error(`Variable name \"${exp.args[0].value}\" already exists`);
  }
  //combine all args into one string
  var selector_str = "";
  for (var i = 2; i < exp.args.length; i++) {
    for (var j = 0; j < exp.args[i].value.length; j++) {
      if (!exp.args[i].value.match(/^[a-zA-Z0-9_&|="<>()]+$/)) {
        throw new Error(`Invalid selector string \"${exp.args[i].value}\"`);
      }
    }
    selector_str += exp.args[i].value;
  }
  var selector;
  try {
    selector = new Selector(selector_str, env);
  } catch (e) {
    throw new Error(e.message);
  }
  //add selector to map
  env.selectorVarMap.set(exp.args[0].value, selector);
  return selector;
}

/* Parses nested lists containing Nodes and Node Groups string IDs into a 1D list of Nodes and Node Groups */
function get_nodes_and_groups(env, nested_arr) {
  var node_arr = [];
  for (var i = 0; i < nested_arr.length; i++) {
    if (Array.isArray(nested_arr[i])) {
      node_arr = node_arr.concat(get_nodes_and_groups(env, nested_arr[i]));
    } else {
      var node = nested_arr[i];
      if (typeof node == "string") {
        // Get the corresponding node group
        node_arr.push(get_node_group(env, node));
      } else {
        node_arr.push(node);
      }
    }
  }
  return node_arr;
}

function create_edges(env, senders, receivers, op) {
  for (var sender of senders) {
    for (var receiver of receivers) {
      var edge = get_edge(sender, receiver, op);
      if (edge == null) {
        edge = new Edge(sender, receiver, op);
        sender.out_edges.push(edge);
        receiver.in_edges.push(edge);
      }
      env.curr_graph.edges.push(edge);
    }
  }
}

async function create_graph(env, edge_list, name) {
  var graph = new Graph(name);
  env.curr_graph = graph;
  await evaluate(edge_list, env);
  env.curr_graph = null;
  return graph;
}

async function create_implicit_graph(op_exp, env) {
  var graph = new Graph();
  env.curr_graph = graph;
  await apply_op(env, op_exp.operator, op_exp.left, op_exp.right);
  env.curr_graph = null;

  /* NOTE: Currently, there is no need to save the graph in the environment with the named graphs */
  return graph;
}

function create_graph_cmd(env, exp) {
  if (exp.args.length != 2 || exp.args[1].value != "{") {
    throw new Error(`Invalid arguments, not a valid graph`);
  }
  if (env.graphVarMap.has(exp.args[0].value)) {
    throw new Error(`Variable name \"${exp.args[0].value}\" already exists`);
  }
  var graph = new Graph(exp.args[0].value);
  env.graphVarMap.set(exp.args[0].value, graph);
  env.graphStack.push(graph);
}

function create_tag(env, exp) {
  if (exp.args.length < 2) {
    throw new Error(`Invalid arguments, requires at least one tag`);
  }
  var name = exp.args[0].value;
  //check if name begins with a letter
  if (!name.match(/^[a-zA-Z]/)) {
    throw new Error(`Invalid tag name \"${name}\"`);
  }
  //find if name exists in hosts
  var target = null;
  for (var host of env.api.hosts) {
    if (host.id == name) {
      target = host;
    }
  }
  if (target == null) {
    if (env.nodeVarMap.has(name)) {
      target = env.nodeVarMap.get(name);
    } else if (env.graphVarMap.has(name)) {
      target = env.graphVarMap.get(name);
    } else {
      throw new Error(`No node or host named \"${name}\"`);
    }
  }
  for (var i = 1; i < exp.args.length; i++) {
    //split string with '=' separator
    var tag = exp.args[i].value.split("=");
    if (tag.length != 2) {
      throw new Error(`Invalid tag declaration \"${exp.args[i].value}\"`);
    }
    //check if tag already exists
    if (target.tags[tag[0]] != undefined) {
      throw new Error(`Tag \"${tag[0]}\" already exists on \"${name}\"`);
    }
    //check if tag value is a number
    if (!isNaN(tag[1]) && tag[1] != true && tag[1] != false) {
      //convert to number
      tag[1] = Number(tag[1]);
      target.tags[tag[0]] = tag[1];
      continue;
    }
    //check if tag value is a boolean
    if (tag[1] == "true" || tag[1] == "false") {
      tag[1] = tag[1] == "true";
      target.tags[tag[0]] = tag[1];
      continue;
    }
    //check if tag value has quotation marks
    if (tag[1].charAt(0) != '"' || tag[1].charAt(tag[1].length - 1) != '"') {
      throw new Error(
        `Tag value \"${tag[1]}\" must be enclosed in quotation marks if it is not a number or boolean`
      );
    }
    //strip quotation marks
    //tag[1] = tag[1].substring(1, tag[1].length - 1);
    target.tags[tag[0]] = tag[1];
  }
  return target;
}

async function evaluate(exp, env) {
  //console.log(exp);
  switch (exp.type) {
    case "num":
    case "str":
    case "id":
      return exp.value;

    case "cmd":
      return await evaluate_cmd(exp, env);

    case "op":
      // A graph is implicitly created when piping is used outside of the connect command edge list
      // e.g. 10 * (spawn map.js) -> 4 * (spawn reduce.js #camera) ~> spawn reduce.js log.txt
      if (is_piping_op(exp) && !env.curr_graph) {
        return await create_implicit_graph(exp, env);
      } else {
        return await apply_op(env, exp.operator, exp.left, exp.right);
      }

    case "list":
      var val = [];
      for (var exp of exp.elems) {
        val.push(await evaluate(exp, env));
      }
      return val;

    case "prog":
      var res = [];
      for (var exp of exp.prog) {
        res.push(await evaluate(exp, env));
        // console.log(res); // TODO: remove print after debugging
      }
      // Wait until async verifications resolve
      await Promise.all(env.verifs)
        .then(() => {
          let spawner = new Spawner(env);
          if (env.matchedHosts && env.matchedHosts.length > 0) {
            //convert matchedhosts to array of host id's
            let host_ids = [];
            for (var host of env.matchedHosts) {
              host_ids.push(host.id);
            }
            //spawn nodes
            env.matchedHosts = [];
            return Promise.all([
              spawner.spawn_nodes(env.nodeSpawnQueue, host_ids),
            ]);
          }
          return Promise.all([
            spawner.spawn_nodes(env.nodeSpawnQueue),
            //spawner.create_pipes(env.edgeSpawnQueue),
          ]);
        })
        .finally(() => {
          return env.doneEval();
        });

      return res;

    default:
      throw new Error("I don't know how to evaluate " + exp.type);
  }
}

async function evaluate_cmd(exp, env) {
  var cmd = exp.cmd;
  switch (cmd) {
    case "node":
      return create_node(env, exp, false);
    case "edge":
      return create_edge(env, exp);
    case "graph":
      return create_graph_cmd(env, exp);
    case "tag":
      return create_tag(env, exp);
    case "selector":
      return create_selector(env, exp);
    case "}":
      if (env.graphStack.length > 0) {
        //remove last element of graphStack
        var graph = env.graphStack.pop();
        return graph;
      } else {
        throw new Error("Unmatched }");
      }

    case "spawn":
      // If first arg is a string, then we are spawning an existing node group or graph
      var first_arg = exp.args[0];
      var hosts = env.api.hosts;
      var host_map = new Map();
      for (var host of hosts) {
        host_map.set(host.id, host);
      }
      if (exp.args.length == 3 && exp.args[1].value == "on") {
        var selector1name = exp.args[0].value;
        var selector2name = exp.args[2].value;
        //check if selector1 exists
        if (!env.selectorVarMap.has(selector1name)) {
          throw new Error(`Selector \"${selector1name}\" does not exist`);
        }
        //check if selector2 exists
        if (!env.selectorVarMap.has(selector2name)) {
          throw new Error(`Selector \"${selector2name}\" does not exist`);
        }
        var selectorNodes = env.selectorVarMap.get(selector1name);
        var selectorHosts = env.selectorVarMap.get(selector2name);
        selectorNodes.evalStr = selectorNodes.str;

        //loop through nodes in env.nodeVarMap
        var matchedNodes = [];
        for (var node of env.nodeVarMap.values()) {
          //loop through node tags
          for (const prop in node.tags) {
            for (const tag of selectorNodes.tags) {
              if (prop == tag.key) {
                if (tag.operator == "=" && node.tags[prop] == tag.value)
                  tag.curVal = true;
                else if (
                  tag.operator == ">" &&
                  parseInt(node.tags[prop]) > parseInt(tag.value)
                )
                  tag.curVal = true;
                else if (
                  tag.operator == "<" &&
                  parseInt(node.tags[prop]) < parseInt(tag.value)
                )
                  tag.curVal = true;
              }
            }
          }
          for (const tag of selectorNodes.tags) {
            if (tag.curVal === true) {
              selectorNodes.evalStr = selectorNodes.evalStr.replace(
                new RegExp(selectorNodes.words[tag.wordIndex], "g"),
                "true"
              );
            } else {
              selectorNodes.evalStr = selectorNodes.evalStr.replace(
                new RegExp(selectorNodes.words[tag.wordIndex], "g"),
                "false"
              );
            }
          }
          for (var i = 0; i < selectorNodes.words.length; i++) {
            selectorNodes.evalStr = selectorNodes.evalStr.replace(
              new RegExp(selectorNodes.words[i], "g"),
              "false"
            );
          }
          if (processString(selectorNodes.evalStr)) {
            matchedNodes.push(node);
          }
          //reset tags
          for (const tag of selectorNodes.tags) {
            tag.curVal = false;
          }
          selectorNodes.evalStr = selectorNodes.str;
        }
        if (matchedNodes.length == 0) {
          throw new Error(`No nodes matched selector \"${selector1name}\"`);
        }
        //loop through hosts in hostmap
        var matchedHosts = [];
        for (var host of host_map.values()) {
          //loop through host tags
          for (const prop in host.tags) {
            for (const tag of selectorHosts.tags) {
              if (prop == tag.key) {
                if (tag.operator == "=" && host.tags[prop] == tag.value)
                  tag.curVal = true;
                else if (
                  tag.operator == ">" &&
                  parseInt(host.tags[prop]) > parseInt(tag.value)
                )
                  tag.curVal = true;
                else if (
                  tag.operator == "<" &&
                  parseInt(host.tags[prop]) < parseInt(tag.value)
                )
                  tag.curVal = true;
              }
            }
          }
          for (const tag of selectorHosts.tags) {
            if (tag.curVal === true) {
              selectorHosts.evalStr = selectorHosts.evalStr.replace(
                new RegExp(selectorHosts.words[tag.wordIndex], "g"),
                "true"
              );
            } else {
              selectorHosts.evalStr = selectorHosts.evalStr.replace(
                new RegExp(selectorHosts.words[tag.wordIndex], "g"),
                "false"
              );
            }
          }
          for (var i = 0; i < selectorHosts.words.length; i++) {
            selectorHosts.evalStr = selectorHosts.evalStr.replace(
              new RegExp(selectorHosts.words[i], "g"),
              "false"
            );
          }
          if (processString(selectorHosts.evalStr)) {
            matchedHosts.push(host);
          }
          //reset tags
          for (const tag of selectorHosts.tags) {
            tag.curVal = false;
          }
          selectorHosts.evalStr = selectorHosts.str;
        }
        if (matchedHosts.length == 0) {
          throw new Error(`No hosts matched selector \"${selector2name}\"`);
        }
        for (var node of matchedNodes) {
          spawn_node(env, node);
        }
        env.matchedHosts = matchedHosts;
        return "Success";
      } else if (first_arg.type == "str") {
        // TODO: prevent a graph and node group from having the same name
        var id = first_arg.value;
        if (env.graphVarMap.has(id)) {
          spawn_graph(env, env.graphVarMap.get(id));
        } else if (env.nodeVarMap.has(id)) {
          spawn_node(env, env.nodeVarMap.get(id));
        } else if (env.edgeVarMap.has(id)) {
          if (
            env.edgeVarMap.get(id).sender.pid == null ||
            env.edgeVarMap.get(id).receiver.pid == null
          ) {
            throw new Error(
              "Pipe creation failed, one of the nodes is not spawned yet"
            );
          } else {
            spawn_edge(env, env.edgeVarMap.get(id));
          }
        } else {
          throw new Error(
            `\"${id}\" does not correspond to a graph, node, or edge`
          );
        }
        return "Success";
      } else {
        // We are spawning a new node
        return create_node(env, exp, true);
      }

    case "connect":
      /* Create a graph */
      var graph_name = exp.graph;
      if (is_graph(env, graph_name)) {
        throw new Error(`Graph \"${graph_name}\" already exists`);
      }
      var graph = await create_graph(env, exp.args[0], graph_name);
      env.Graphs[graph_name] = graph;
      return graph;

    case "spawn_connect":
      // Create an unnamed graph
      var graph = await create_graph(env, exp.args[0]);
      spawn_graph(env, graph);
      return graph;
    case "echo":
      if (exp.args.length == 0) {
        return "";
      }
      var target = null;
      for (var host of env.api.hosts) {
        if (host.id == exp.args[0].value) {
          target = host;
        }
      }
      if (target == null) {
        //search for node, edge, or graph
        if (env.nodeVarMap.has(exp.args[0].value)) {
          target = env.nodeVarMap.get(exp.args[0].value);
        } else if (env.edgeVarMap.has(exp.args[0].value)) {
          target = env.edgeVarMap.get(exp.args[0].value);
        } else if (env.graphVarMap.has(exp.args[0].value)) {
          target = env.graphVarMap.get(exp.args[0].value);
        } else {
          throw new Error(
            `\"${exp.args[0].value}\" does not correspond to a graph, node, edge, or host`
          );
        }
      }
      return target;
    default:
      // Check the environment for the command
      return await env.get(exp.cmd).then((res) => res(get_args(exp.args), env));
  }
}

async function apply_op(env, op, left_exp, right_exp) {
  function num(x) {
    if (typeof x != "number") throw new Error("Expected number but got " + x);
    return x;
  }
  switch (op) {
    case "*":
      var x = await evaluate(left_exp, env);
      var vals = [];
      for (var i = 0; i < num(x); i++) {
        vals.push(await evaluate(right_exp, env));
      }
      return vals;
    case "~>":
    case "->":
    case "-*>":
    case "~*>":
    case "~/>":
      var senders = await evaluate(left_exp, env);
      var receivers = await evaluate(right_exp, env);

      /* Note: Depending on the evaluation result, senders and receivers can contain nested arrays
            of Nodes and IDs of NodeGroups or they may be a single Node or NodeGroup ID. We want to flatten
            them into a 1D array of Nodes and NodeGroups */
      if (!Array.isArray(senders)) senders = [senders];
      if (!Array.isArray(receivers)) receivers = [receivers];
      senders = get_nodes_and_groups(env, senders);
      receivers = get_nodes_and_groups(env, receivers);

      create_edges(env, senders, receivers, op);
      return receivers; // Return receivers so we can chain pipes
  }
  throw new Error("Can't apply operator " + op);
}

module.exports = evaluate;
