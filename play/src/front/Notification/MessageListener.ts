import { z } from "zod";
import * as Sentry from "@sentry/svelte";
import { ChatRoom } from "../Chat/Connection/ChatConnection";
import { selectedRoomStore } from "../Chat/Stores/ChatStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { proximityMeetingStore } from "../Stores/MyMediaStore";

class NotificationsListener {

    constructor(private channels: Map<string, BroadcastChannel> = new Map()) {}

    public addChannel(channel: BroadcastChannel) {
        if(this.channels.has(channel.name)) return;
        this.channels.set(channel.name, channel);
    }

    public removeChannel(channel: BroadcastChannel) {
        this.channels.delete(channel.name);
    }

    public destroy() {
        this.channels.forEach((channel) => {
            channel.close();
        });
    }
}

export enum NotificationChannel {
    message = "message",
}

const NotificationSchema = z.object({
    type: z.literal("openChat"),
    data: z.object({
        chatRoomId: z.string(),
        chatRoomName: z.string(),
        tabUrl: z.string()
    })
});

const messageChannel = new BroadcastChannel(NotificationChannel.message);
messageChannel.onmessage = async (event) => {
    try {
        const result = NotificationSchema.parse(event.data);
        const validatedData = result.data;
            const chatRoomId :string = JSON.parse(validatedData.chatRoomId);
            
            let room : ChatRoom | undefined;

            if(chatRoomId === "proximity") {
                proximityMeetingStore.set(true);
                room = gameManager.getCurrentGameScene().proximityChatRoom;
            } else {
                const chatConnection = await gameManager.getChatConnection();
                room = await chatConnection.getRoom(chatRoomId);
            }
            if(room) {
                selectedRoomStore.set(room);
            }
    } catch (error) {
        Sentry.captureException(error);
        console.error("Invalid notification data:", error);
        return;
    }
};


export const notificationListener = new NotificationsListener(new Map([["messageNotification", messageChannel]]));