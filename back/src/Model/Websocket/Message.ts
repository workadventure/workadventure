export class Message {
    userId: string;
    roomId: string;

    constructor(message: string) {
        let data = JSON.parse(message);
        if(!data.userId || !data.roomId){
            throw Error("userId or roomId cannot be null");
        }
        this.userId = data.userId;
        this.roomId = data.roomId;
    }

    toJson() {
        return {
            userId: this.userId,
            roomId: this.roomId,
        }
    }
}