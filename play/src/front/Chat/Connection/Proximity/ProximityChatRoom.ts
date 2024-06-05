import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import { Readable, get, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import {
    ChatMessage,
    ChatMessageContent,
    ChatMessageReaction,
    ChatMessageType,
    ChatRoom,
    ChatRoomMembership,
    ChatUser,
} from "../ChatConnection";
import LL from "../../../../i18n/i18n-svelte";
import { ProximityChatConnection } from "./ProximityChatConnection";

export class ProximityChatMessage implements ChatMessage {
    isQuotedMessage = undefined;
    quotedMessage = undefined;
    isDeleted = writable(false);
    isModified = writable(false);

    constructor(
        public id: string,
        public sender: ChatUser,
        public content: Readable<ChatMessageContent>,
        public date: Date,
        public isMyMessage: boolean,
        public type: ChatMessageType
    ) {}

    remove(): void {
        console.info("Function not implemented.");
    }
    edit(newContent: string): Promise<void> {
        console.info("Function not implemented.", newContent);
        return Promise.resolve();
    }
    addReaction(reaction: string): Promise<void> {
        console.info("Function not implemented.", reaction);
        return Promise.resolve();
    }
}

export class ProximityChatRoom implements ChatRoom {
    id = "proximity";
    name = writable("Proximity Chat");
    type: "direct" | "multiple" = "direct";
    hasUnreadMessages = writable(false);
    avatarUrl = undefined;
    messages: SearchableArrayStore<string, ChatMessage> = new SearchableArrayStore((item) => item.id);
    messageReactions: MapStore<string, MapStore<string, ChatMessageReaction>> = new MapStore();
    myMembership: ChatRoomMembership = "member";
    membersId: string[] = [];
    hasPreviousMessage = writable(false);
    isEncrypted = writable(false);

    constructor(private _connection: ProximityChatConnection, private _user: ChatUser) {}

    sendMessage(message: string, action: ChatMessageType = "proximity", broadcast = true): void {
        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            this._user,
            writable(newChatMessageContent),
            new Date(),
            true,
            action
        );

        // Add message to the list
        this.messages.push(newMessage);

        // Use the room connection to send the message to other users of the space
        const spaceName = get(this._connection.spaceName);
        if (broadcast && spaceName != undefined)
            this._connection.roomConnection.emitProximityPublicMessage(spaceName, message);
    }

    addIncomingUser(userName: string): void {
        this.sendMessage(get(LL).chat.timeLine.incoming({ userName }), "incoming", false);
    }

    addOutcomingUser(userName: string): void {
        this.sendMessage(get(LL).chat.timeLine.outcoming({ userName }), "outcoming", false);
    }

    startWriting(): void {
        console.info("Function not implemented yet!");
    }

    stopWriting(): void {
        console.info("Function not implemented yet!");
    }

    sendFiles(files: FileList): Promise<void> {
        return Promise.resolve();
    }
    setTimelineAsRead(): void {
        console.info("setTimelineAsRead => Method not implemented yet!");
    }
    leaveRoom(): void {
        throw new Error("leaveRoom => Method not implemented.");
    }
    joinRoom(): void {
        throw new Error("joinRoom => Method not implemented.");
    }
    loadMorePreviousMessages(): Promise<void> {
        return Promise.resolve();
    }
}
