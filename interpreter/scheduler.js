const MockRuntime = require("./mock-runtime.js");
const chalk = require("chalk");

var nodes = [10,20,30,40];


class Stack{
    constructor(){
        this.items = [];
        this.size = 50;
    }
    push(element){
        this.items.push(element);
    }
    printStack()
    {
        var str = "";
        for (var i = 0; i < this.items.length; i++)
            str += this.items[i] + " ";
        return str;
    }
}

var stack = new Stack();
const max = Math.max(...nodes);
nodes.filter(number => number !== max);
if(max<=stack.size){
    stack.push(max);
    stack.size=stack.size-max;
}
// stack.size = fluc;
if(stack.size>0){
    for(var i=0; i<nodes.length; i++){
        if(nodes[i]<=stack.size){
            stack.push(nodes[i]);
            stack.size=stack.size-nodes[i];
        }
    }   
}
// for(var i=0; i<nodes.length; i++){
//    if(stack.size>=0){
        
//         stack.push(nodes[i]);
//         stack.size = stack.size - nodes[i];
//     }
//     // nodes.forEach(element => stack.push(element));
    
// } 
// stack.push(1);
console.log(stack.printStack());
console.log(stack.size);
// getAllRuntimes(){
//     let info = {};
//     info[this.config.id] = this.summary();
//     Object.values(this.runtimes).forEach((runtime) => {
//         info[runtime.id] = runtime;
//     });
//     return info;
// }
<<<<<<< HEAD
var nodes = [10,20,30,40,10,10,30,20];

var duplicate = [];
// let runtime = new MockRuntime();
class Stack{
    constructor(id, size){
        this.id = id;
        this.privateQueue = [];
        this.privateQueue.size = size;
        this.items = [];
        this.size = size;
    }
    push(element){
        this.items.push(element);
    }
    printStack(){
        var str = "";
        for(var i=0; i<this.items.length;i++){
            str+= this.items[i] + " ";
        }
        return str;

    }
}
//label for terminating and non-terminating
//create 5 nodes in scheduler of video survilleance app.
class Scheduler{
    constructor(){
       this.runtimes=[
            new Stack(1,50),
            new Stack(2,50),
            new Stack(3, 100),
        ];
    }
    async listRuntime(){
        console.log(this.runtimes);
    }
    async assignNodes(){
        // while()
        for(var i=0; i<nodes.length; i++){

            if(this.runtimes[0].privateQueue.size>=nodes[i]){
                this.runtimes[0].privateQueue.push(nodes[i]);
                // duplicate.push(nodes[i]);
                this.runtimes[0].privateQueue.size=this.runtimes[0].privateQueue.size-nodes[i];
            } else if(this.runtimes[1].privateQueue.size>=nodes[i]){
                this.runtimes[1].privateQueue.push(nodes[i]);
                this.runtimes[1].privateQueue.size=this.runtimes[1].privateQueue.size-nodes[i];
            }
        }
        // console.log(nodes);
        console.log(this.runtimes);
        if(i==nodes.length){
            this.runtimes[0].privateQueue.forEach(element => this.runtimes[0].items.push(element));
            this.runtimes[0].privateQueue=[];
            this.runtimes[0].privateQueue=this.runtimes[0].size;
            this.runtimes[1].privateQueue.forEach(element => this.runtimes[1].items.push(element));
            this.runtimes[1].privateQueue=[];
            this.runtimes[1].privateQueue=this.runtimes[1].size;
        }
    }
}

const list = new ListofStacks;
list.push();
list.listRuntime();
// for(var i=0; i<nodes.length; i++){
//     if(stack1.size>=nodes[i]){
//         stack1.push(nodes[i]);
//         stack1.size=stack1.size-nodes[i];
//     } else if(stack2.size>=nodes[i]){
//         stack2.push(nodes[i]);
//         stack2.size=stack2.size-nodes[i];
//     }
// }

// function()
// console.log(stack1, stack2);


=======
// let runtime = new MockRuntime();
>>>>>>> 4c111e6b7c2c8f242efae6ef215765018c7c093d
// var hosts = [new Host("p1-0")];
// let info = [];
// info.push(runtime.hosts);
// let count=0;
// for(let i=0; i<runtime.hosts.length; i++){
//     count++;
// }
// let no_of_runtimes = runtime.hosts.length;
// console.log(no_of_runtimes);
// var ou = runtime.hosts;
// console.log(ou);
// console.log(runtime.listProcesses());
// module.exports = Scheduler;

//sample
// class processes{
//     constructor(arrival_time, burst_time){
//         this.arrival_time = arrival_time || 0;
//         this.burst_time = burst_time;
//         this.set_priority = 0;
//     }
    // process1( x,  y){
    //     this.x = x;
    //     this.y = y;
    //     return (x,y);

    // }
    // 
// }
// const process1 = new processes(0 ,1);
// const process2 = new processes(0 ,2);
// const process3 = new processes(0 ,4);
// const process4 = new processes(0 ,3);
// const list = [];
// const up_li = [];
// list.push(process1, process2, process3, process4);
// list.sort((a,b) => (a.burst_time > b.burst_time) ? 1 : -1);
// console.log(list);
// up_li.push(list[0]);
// for(var i=1; i<list.length; i++){
//     var curr = list[i-1].set_priority;
//     list[i].set_priority = curr+1;
//     up_li.push(list[i]);
    
// }

// console.log(up_li);