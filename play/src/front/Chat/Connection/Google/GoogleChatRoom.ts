import axios from "axios";
import { Readable, writable } from "svelte/store";
import { ChatMessage, ChatRoom } from "../ChatConnection";

export class GoogleChatRoom implements ChatRoom {
    id: string;
    name: Readable<string>;
    type: "direct" | "multiple" = "multiple";
    hasUnreadMessages: Readable<boolean> = writable(false);
    avatarUrl: string | undefined = undefined;
    messages: Readable<readonly ChatMessage[]> = writable([]);
    hasPreviousMessage: Readable<boolean> = writable(false);
    isEncrypted: Readable<boolean> = writable(false);
    typingMembers: Readable<Array<{ id: string; name: string | null; avatarUrl: string | null; }>> = writable([]);
    isRoomFolder = false;
    lastMessageTimestamp = 0;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = writable(name);
    }

    sendMessage(message: string): void {
        axios.post(`/api/google-chat/spaces/${this.id}/messages`, { message });
    }

    async sendFiles(files: FileList): Promise<void> {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }
        await axios.post(`/api/google-chat/spaces/${this.id}/files`, formData);
    }

    setTimelineAsRead(): void {
        axios.post(`/api/google-chat/spaces/${this.id}/read`);
    }

    async loadMorePreviousMessages(): Promise<void> {
        const response = await axios.get<ChatMessage[]>(`/api/google-chat/spaces/${this.id}/messages`);
        // This should be implemented by updating the messages store
    }

    async startTyping(): Promise<object> {
        return axios.post(`/api/google-chat/spaces/${this.id}/typing`, { typing: true });
    }

    async stopTyping(): Promise<object> {
        return axios.post(`/api/google-chat/spaces/${this.id}/typing`, { typing: false });
    }
}
