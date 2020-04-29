import {Message} from "./Message";
import {PointInterface} from "./PointInterface";

export class Point implements PointInterface{
    x: number;
    y: number;
    direction: string;

    constructor(x : number, y : number, direction : string = "none") {
        if(x === null || y === null){
            throw Error("position x and y cannot be null");
        }
        this.x = x;
        this.y = y;
        this.direction = direction;
    }

    toJson(){
        return {
            x : this.x,
            y: this.y,
            direction: this.direction
        }
    }
}

export class MessageUserPosition extends Message{
    position: PointInterface;

    constructor(message: any) {
        super(message);
        this.position = new Point(message.position.x, message.position.y, message.position.direction);
    }

    toString() {
        return JSON.stringify(
            Object.assign(
                super.toJson(),
                {
                    position: this.position.toJson()
                })
        );
    }
}
