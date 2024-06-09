class Dog{
    private y: number;

    constructor(){
        
    }

    static {
        
    }

    bark(){
        console.log('woof!');
    }

    get x(){
        return this.y;
    }

    set x(x1: number){
        this.y = x1;
    }

}

const spot = new Dog();
let y = spot.x;
spot.bark();
spot.x = 5;