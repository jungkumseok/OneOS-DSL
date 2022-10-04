const array = [2, 99, 9,2];

console.log(array);


for(var i=0;i<array.length;i++){
    if(array[i]>5){
        array.splice(i, 1);
    }
    i=0;
    
}

// array = [2, 9]
console.log(array); 