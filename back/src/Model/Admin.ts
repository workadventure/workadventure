import type { AdminSocket } from "../RoomManager";
import { writeWithBackpressure } from "../Services/StreamBackpressure";

export class Admin {
    public constructor(private readonly socket: AdminSocket) {}

    public sendUserJoin(uuid: string, name: string, ip: string): void {
        writeWithBackpressure(
            this.socket,
            {
                message: {
                    $case: "userJoinedRoom",
                    userJoinedRoom: {
                        uuid: uuid,
                        name: name,
                        ipAddress: ip,
                    },
                },
            },
            {},
            "back_admin_socket"
        );
    }

    public sendUserLeft(uuid: string /*, name: string, ip: string*/): void {
        writeWithBackpressure(
            this.socket,
            {
                message: {
                    $case: "userLeftRoom",
                    userLeftRoom: {
                        uuid: uuid,
                    },
                },
            },
            {},
            "back_admin_socket"
        );
    }
}
