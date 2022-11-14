import {
    ServerToAdminClientMessage,
    UserJoinedRoomMessage,
    UserLeftRoomMessage,
} from "@workadventure/legacy-proto-messages/dist/messages_pb.js";
import { AdminSocket } from "../RoomManager.js";

export class Admin {
    public constructor(private readonly socket: AdminSocket) {}

    public sendUserJoin(uuid: string, name: string, ip: string): void {
        const serverToAdminClientMessage = new ServerToAdminClientMessage();

        const userJoinedRoomMessage = new UserJoinedRoomMessage();
        userJoinedRoomMessage.setUuid(uuid);
        userJoinedRoomMessage.setName(name);
        userJoinedRoomMessage.setIpaddress(ip);

        serverToAdminClientMessage.setUserjoinedroom(userJoinedRoomMessage);

        this.socket.write(serverToAdminClientMessage);
    }

    public sendUserLeft(uuid: string /*, name: string, ip: string*/): void {
        const serverToAdminClientMessage = new ServerToAdminClientMessage();

        const userLeftRoomMessage = new UserLeftRoomMessage();
        userLeftRoomMessage.setUuid(uuid);

        serverToAdminClientMessage.setUserleftroom(userLeftRoomMessage);

        this.socket.write(serverToAdminClientMessage);
    }
}
