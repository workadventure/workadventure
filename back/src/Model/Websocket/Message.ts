export class Message {
    userId: string;
    name: string;
    character: string;

    constructor(data: any) {
        if (!data.userId) {
            console.error("Got invalid message", data);
            throw Error("userId cannot be null");
        }
        this.userId = data.userId;
        this.name = data.name;
        this.character = data.character;
    }
}
