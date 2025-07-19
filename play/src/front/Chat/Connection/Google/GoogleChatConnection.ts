import { Readable, Writable, writable } from "svelte/store";
import {
    ChatConnectionInterface,
    ChatRoom,
    ChatUser,
    ConnectionStatus,
    CreateRoomOptions,
    RoomFolder,
} from "../ChatConnection";

import axios from "axios";
import { Readable, Writable, writable } from "svelte/store";
import {
    ChatConnectionInterface,
    ChatRoom,
    ChatUser,
    ConnectionStatus,
    CreateRoomOptions,
    RoomFolder,
} from "../ChatConnection";

export class GoogleChatConnection implements ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus> = writable("ONLINE");
    directRooms: Readable<ChatRoom[]> = writable([]);
    rooms: Readable<(ChatRoom)[]> = writable([]);
    invitations: Readable<ChatRoom[]> = writable([]);
    folders: Readable<RoomFolder[]> = writable([]);
    roomCreationInProgress: Readable<boolean> = writable(false);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(false);
    hasUnreadMessages: Readable<boolean> = writable(false);
    directRoomsUsers: Readable<ChatUser[]> = writable([]);
    shouldRetrySendingEvents: Readable<boolean> = writable(false);

    constructor() {
        console.log("GoogleChatConnection created");
    }

    async createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        const response = await axios.post<{ room_id: string }>("/api/google-chat/spaces", roomOptions);
        return response.data;
    }

    async createFolder(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        const response = await axios.post<{ room_id: string }>("/api/google-chat/spaces", { ...roomOptions, isFolder: true });
        return response.data;
    }

    async createDirectRoom(userChatId: string): Promise<ChatRoom> {
        const response = await axios.post<ChatRoom>("/api/google-chat/direct-messages", { userChatId });
        return response.data;
    }

    getDirectRoomFor(userChatId: string): ChatRoom | undefined {
        // This should be implemented by searching through the existing direct rooms
        return undefined;
    }

    async searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined; }[]> {
        const response = await axios.get<{ id: string; name: string | undefined; }[]>("/api/google-chat/spaces", { params: { searchText } });
        return response.data;
    }

    async joinRoom(roomId: string): Promise<ChatRoom | undefined> {
        const response = await axios.post<ChatRoom>(`/api/google-chat/spaces/${roomId}/join`);
        return response.data;
    }

    async destroy(): Promise<void> {
        // Nothing to do here
    }

    async searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined; }[] | undefined> {
        const response = await axios.get<{ id:string; name: string | undefined; }[]>("/api/google-chat/users", { params: { searchText } });
        return response.data;
    }

    async initEndToEndEncryption(): Promise<void> {
        // Not supported by Google Chat
    }

    clearListener(): void {
        // Nothing to do here
    }

    async isUserExist(address: string): Promise<boolean> {
        try {
            await axios.get(`/api/google-chat/users/${address}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    getRoomByID(roomId: string): ChatRoom {
        // This should be implemented by fetching the room from the backend
        throw new Error("Method not implemented.");
    }

    async retrySendingEvents(): Promise<void> {
        // Not supported by Google Chat
    }
}
