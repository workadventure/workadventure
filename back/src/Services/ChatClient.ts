import { ChatZone } from "./MucManager";

export interface ChatClient {
    getAllMucRooms(): Promise<Array<string> | Error>;

    destroyMucRoom(name: string): Promise<void>;

    createMucRoom(chatZone: ChatZone): Promise<void>;
}
