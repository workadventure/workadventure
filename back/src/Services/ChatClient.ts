import { ChatZone } from "./MucManager.js";

export interface ChatClient {
    getAllMucRooms(): Promise<Array<string> | Error>;

    destroyMucRoom(name: string): Promise<void>;

    createMucRoom(chatZone: ChatZone): Promise<void>;
}
