export class JoinRoomMessage {
    userId: string;
    roomId: string;
    positionXUser: string;
    positionYUser: string;

    constructor(message: string) {
        let data = JSON.parse(message);
        this.userId = data.userId;
        this.roomId = data.roomId;
        this.positionXUser = data.positionXUser;
        this.positionYUser = data.positionYUser;
    }

    toString(){
        return JSON.stringify({
            userId: this.userId,
            roomId: this.roomId,
            positionXUser: this.positionXUser,
            positionYUser: this.positionYUser
        })
    }
}