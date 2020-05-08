export class Message {
    userId: string;
    roomId: string;
    name: string;
    character: string;

    constructor(data: any) {
        if (!data.userId || !data.roomId) {
            throw Error("userId or roomId cannot be null");
        }
        this.userId = data.userId;
        this.roomId = data.roomId;
        this.name = data.name;
        this.character = data.character;
    }

    toJson() {
        return {
            userId: this.userId,
            roomId: this.roomId,
            name: this.name,
            character: this.character
        }
    }
}
