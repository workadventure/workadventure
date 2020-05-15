export class Message {
    userId: string;
    roomId: string;
    name: string;
    character: string;

    constructor(data: any) {
        if (!data.userId || !data.roomId) {
            console.error("Got invalid message", data);
            throw Error("userId or roomId cannot be null");
        }
        this.userId = data.userId;
        this.roomId = data.roomId;
        this.name = data.name;
        this.character = data.character;
    }
}
