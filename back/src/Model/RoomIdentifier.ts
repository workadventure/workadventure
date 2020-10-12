export class RoomIdentifier {
    public anonymous: boolean;
    public id:string
    constructor(roomID: string) {
        if (roomID.indexOf('_/') === 0) {
            this.anonymous = true;
        } else if(roomID.indexOf('@/') === 0) {
            this.anonymous = false;
        } else {
            throw new Error('Incorrect room ID: '+roomID);
        }
        this.id = roomID; //todo: extract more data from the id (like room slug, organization name, etc);
    }
}