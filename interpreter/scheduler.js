class Stack{
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
//label for terminating and non-terminating
//create 5 nodes in scheduler of video survilleance app.
class ListofStacks{
    constructor(){
       this.runtimes=[
            new Stack(1,50),
            new Stack(2,100),
            new Stack(3,100),
        ];
    }
    async listRuntime(){
        console.log(this.runtimes);
    }
    async push(){
        var nodes = [10,20,30,40,50,80];
        var j =0, i=0;
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
        console.log(this.runtimes);
    }
    async pushToMain(){
        var j=0;
        while(j<this.runtimes.length){
            for(var i=0; i<this.runtimes[j].privateQueue.length;i++){
                this.runtimes[j].items.push(this.runtimes[j].privateQueue[i]);
                this.runtimes[j].privateQueue[i]=0;
            }
            
            j++;
        }
        console.log(this.runtimes);
        
    }
}

const list = new ListofStacks;
list.push();
list.pushToMain();
