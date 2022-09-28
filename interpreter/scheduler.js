const MockRuntime = require("./mock-runtime.js");
const chalk = require("chalk");

var nodes = [10,20,30,40];


class Stack{
    constructor(id, size){
        this.id = id;
        this.items = [];
        this.size = size;
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

var stack1 = new Stack(1,50);
var stack2 = new Stack(2,100);

for(var i=0; i<nodes.length; i++){
    if(stack1.size>nodes[i]){
        stack1.push(nodes[i]);
        stack1.size=stack1.size-nodes[i];
    } else  if(stack2.size>nodes[i] ){
        stack2.push(nodes[i]);
        stack2.size=stack2.size-nodes[i];
    }
}   
    

// nodes.forEach(element => stack1.push(element));
// nodes.forEach(element => stack2.push(element));

console.log(stack1, stack2);

// const max = Math.max(...nodes);
// nodes.filter(number => number !== max);
// if(max<=stack.size){
//     stack.push(max);
//     stack.size=stack.size-max;
// }
// // stack.size = fluc;
// if(stack.size>0){
//     for(var i=0; i<nodes.length; i++){
//         if(nodes[i]<=stack.size){
//             stack.push(nodes[i]);
//             stack.size=stack.size-nodes[i];
//         }
//     }   
// }
// for(var i=0; i<nodes.length; i++){
//    if(stack.size>=0){
        
//         stack.push(nodes[i]);
//         stack.size = stack.size - nodes[i];
//     }
//     // nodes.forEach(element => stack.push(element));
    
// } 
// stack.push(1);
// console.log(stack.printStack());
// console.log(stack.size);
// getAllRuntimes(){
//     let info = {};
//     info[this.config.id] = this.summary();
//     Object.values(this.runtimes).forEach((runtime) => {
//         info[runtime.id] = runtime;
//     });
//     return info;
// }
// let runtime = new MockRuntime();
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