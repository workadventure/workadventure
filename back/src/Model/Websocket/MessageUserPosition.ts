import {Message} from "./Message";
import {PointInterface} from "./PointInterface";

export class Point implements PointInterface{
    x: number;
    y: number;

    constructor(x : number, y : number) {
        this.x = x;
        this.y = y;
    }

    toJson(){
        return {
            x : this.x,
            y: this.y
        }
    }
}

export class MessageUserPosition extends Message{
    position: PointInterface

    constructor(message: string) {
        super(message);
        let data = JSON.parse(message);
        this.position = new Point(data.position.x, data.position.y);
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