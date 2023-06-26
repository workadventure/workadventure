import { AdminSocket } from "../RoomManager";

export class Admin {
    public constructor(private readonly socket: AdminSocket) {}

    public sendUserJoin(uuid: string, name: string, ip: string): void {
        this.socket.write({
            message: {
                $case: "userJoinedRoom",
                userJoinedRoom: {
                    uuid: uuid,
                    name: name,
                    ipAddress: ip,
                },
            },
        });
    }

    public sendUserLeft(uuid: string /*, name: string, ip: string*/): void {
        this.socket.write({
            message: {
                $case: "userLeftRoom",
                userLeftRoom: {
                    uuid: uuid,
                },
            },
        });
    }
}
