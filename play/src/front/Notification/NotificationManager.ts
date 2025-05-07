import { z } from "zod";
import * as Sentry from "@sentry/svelte";
import { Subscriber, Unsubscriber, Writable } from "svelte/store";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import { localUserStore } from "../Connection/LocalUserStore";
import { ChatRoom } from "../Chat/Connection/ChatConnection";
import { gameManager } from "../Phaser/Game/GameManager";
import { selectedRoomStore } from "../Chat/Stores/SelectRoomStore";
import { proximityMeetingStore } from "../Stores/MyMediaStore";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { NotificationWA } from "./Notification";

type SelectedRoomStore = {
    subscribe: (this: void, run: Subscriber<ChatRoom | undefined>) => Unsubscriber;
    set: (value: ChatRoom | undefined) => void;
};

class NotificationManager {
    private channels: Map<string, BroadcastChannel> = new Map();

    constructor(private proximityMeetingStore: Writable<boolean>, private selectedRoomStore: SelectedRoomStore) {
        this.createNotificationMessageChannel();
    }

    public hasNotification(): boolean {
        return (
            Notification.permission === "granted" &&
            statusChanger.allowNotificationSound() &&
            localUserStore.getNotification()
        );
    }

    public createNotification(notification: NotificationWA) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            notification.sendNotification().catch((error) => {
                Sentry.captureException(error);
                console.error("Error while sending notification", error);
            });
        }
    }

    private createNotificationMessageChannel() {
        const messageChannel = new BroadcastChannel(NotificationChannel.message);
        messageChannel.onmessage = async (event) => {
            try {
                const result = NotificationSchema.parse(event.data);
                const validatedData = result.data;
                const chatRoomId: string = validatedData.chatRoomId;

                await this.handleMessageNotification(chatRoomId);
            } catch (error) {
                Sentry.captureException(error);
                console.error("Invalid notification data:", error);
                return;
            }
        };

        this.channels.set(NotificationChannel.message, messageChannel);
    }

    private async handleMessageNotification(chatRoomId: string) {
        chatVisibilityStore.set(true);
        let room: ChatRoom | undefined;
        if (chatRoomId === "proximity") {
            this.proximityMeetingStore.set(true);
            room = gameManager.getCurrentGameScene().proximityChatRoom;
        } else {
            const chatConnection = await gameManager.getChatConnection();
            room = chatConnection.getRoomByID(chatRoomId);
        }
        if (room) {
            this.selectedRoomStore.set(room);
        }
    }
}

enum NotificationChannel {
    message = "message",
}

const NotificationSchema = z.object({
    type: z.literal("openChat"),
    data: z.object({
        chatRoomId: z.string(),
    }),
});

export const notificationManager = new NotificationManager(proximityMeetingStore, selectedRoomStore);
