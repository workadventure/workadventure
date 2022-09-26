import { MucRoom } from "./MucManager";

export interface ChatClient {
    getAllMucRooms(): Promise<Array<string> | Error>;

    destroyMucRoom(name: string): Promise<void>;

    createMucRoom(chatZone: MucRoom): Promise<void>;
}
