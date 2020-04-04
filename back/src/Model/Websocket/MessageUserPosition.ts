import {Message} from "./Message";

export class MessageUserPosition extends Message{
    positionXUser: string;
    positionYUser: string;

    constructor(message: string) {
        super(message);
        let data = JSON.parse(message);
        this.positionXUser = data.positionXUser;
        this.positionYUser = data.positionYUser;
    }

    toString() {
        return JSON.stringify(
            Object.assign(
                super.toJson(),
                {
                    positionXUser: this.positionXUser,
                    positionYUser: this.positionYUser
                })
        );
    }
}