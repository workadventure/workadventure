export class RoomIdentifier {
    public readonly anonymous: boolean;
    public readonly id:string
    public readonly organizationSlug: string|undefined;
    public readonly worldSlug: string|undefined;
    public readonly roomSlug: string|undefined;
    constructor(roomID: string) {
        if (roomID.startsWith('_/')) {
            this.anonymous = true;
        } else if(roomID.startsWith('@/')) {
            this.anonymous = false;

            const match = /@\/([^/]+)\/([^/]+)\/(.+)/.exec(roomID);
            if (!match) {
                throw new Error('Could not extract info from "'+roomID+'"');
            }
            this.organizationSlug = match[1];
            this.worldSlug = match[2];
            this.roomSlug = match[3];
        } else {
            throw new Error('Incorrect room ID: '+roomID);
        }
        this.id = roomID;
    }
}
