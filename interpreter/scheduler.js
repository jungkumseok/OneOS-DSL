class Runtime{
    constructor(id, space){
        this.id = id;
        this.privateQueue = [];
        this.privateQueue.space= space;
        this.items = [];
        this.space = space;
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

class Component{ // similar to node
    constructor(name, memory,label){
        this.name = name;
        this.memory = memory;
        this.label = label;
    }
}

//label for terminating and non-terminating
//create 5 nodes in scheduler of video survilleance app.
class Scheduler{
    constructor(){
       this.runtimes=[
            new Runtime(1,50),
            new Runtime(2,100),
            new Runtime(3,100),
            
        ];
        this.procs=[
            new Component("a", 10),
            new Component("b", 20),
            new Component("c", 30),
            new Component("d", 80)
        ];
    }
    async listRuntime(){
        console.log(this.runtimes);
    }
    async assignToPrivate(){
        var nodes = [20,10,30,40];
        var j =0, i=0;
        nodes.sort();
        while(i<nodes.length){
            if(j<this.runtimes.length && this.runtimes[j].privateQueue.space>=nodes[i]){
                this.runtimes[j].privateQueue.push(nodes[i]);
                this.runtimes[j].privateQueue.space = this.runtimes[j].privateQueue.space-nodes[i];
                i++;
            } else {
                j++;
            }
            if(j==this.runtimes.length-1 && nodes[i]>this.runtimes[j].privateQueue.space){
                console.log("No Space left now", this.runtimes);
                break;
            }
        }
        // console.log(this.runtimes);
        // var j =0, i=0;
        // while(i<this.procs.length){
        //     if(j<this.runtimes.length && this.runtimes[j].privateQueue.space>=this.procs[i].memory){
        //         this.runtimes[j].privateQueue.push(this.procs[i]);
        //         this.runtimes[j].privateQueue.space = this.runtimes[j].privateQueue.space-this.procs[i].memory;
        //         i++;
        //     } else {
        //         j++;
            // }
            // if(j==this.runtimes.length-1 && this.procs[i].memory>this.runtimes[j].privateQueue.space){
            //     console.log("No Space left now", this.runtimes);
            //     break;
            // }
        // }
        console.log(this.runtimes);
    }
    async pushToMain(){
        var j=0;
        while(j<this.runtimes.length){
            for(var i=0; i<this.runtimes[j].privateQueue.length;i++){
                this.runtimes[j].items.push(this.runtimes[j].privateQueue[i]);
                this.runtimes[j].space = this.runtimes[j].space - this.runtimes[j].privateQueue[i];
                this.runtimes[j].privateQueue[i]=0;
            }
            
            j++;
        }
        console.log(this.runtimes);
        
    }
}

const scheduler = new Scheduler;
scheduler.assignToPrivate();
scheduler.pushToMain();
