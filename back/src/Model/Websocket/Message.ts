export class Message {
    userId: string;
    roomId: string;
    name: string;
    frame: string;

    constructor(data: any) {
        if (!data.userId || !data.roomId) {
            throw Error("userId or roomId cannot be null");
        }
        this.userId = data.userId;
        this.roomId = data.roomId;
        this.name = data.name;
        this.frame = data.frame;
    }

    toJson() {
        return {
            userId: this.userId,
            roomId: this.roomId,
            name: this.name,
            frame: this.frame
        }
    }
}