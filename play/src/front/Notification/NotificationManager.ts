import { z } from "zod";
import * as Sentry from "@sentry/svelte";
import { get, type Subscriber, type Unsubscriber, type Writable } from "svelte/store";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import { localUserStore } from "../Connection/LocalUserStore";
import type { ChatConversation, ChatRoom } from "../Chat/Connection/ChatConnection";
import { gameManager } from "../Phaser/Game/GameManager";
import { selectedRoomStore } from "../Chat/Stores/SelectRoomStore";
import { proximityMeetingStore } from "../Stores/MyMediaStore";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { desktopAwayStore } from "../Stores/DesktopStatusStore";
import type { NotificationWA } from "./Notification";

type SelectedRoomStore = {
    subscribe: (this: void, run: Subscriber<ChatConversation | undefined>) => Unsubscriber;
    set: (value: ChatConversation | undefined) => void;
};

class NotificationManager {
    private channels: Map<string, BroadcastChannel> = new Map();

    constructor(
        private proximityMeetingStore: Writable<boolean>,
        private selectedRoomStore: SelectedRoomStore,
    ) {
        this.createNotificationMessageChannel();
    }

    public hasNotification(): boolean {
        return (
            Notification.permission === "granted" &&
            statusChanger.allowNotificationSound() &&
            // Desktop idle/away hush: robust even when the availability status machine can't be
            // moved to a silencing status (e.g. a backgrounded window is already AWAY, and
            // AWAY→BACK_IN_A_MOMENT is a rejected transition). See DesktopStatusStore.
            !get(desktopAwayStore) &&
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

    /**
     * Route a click on an OS notification (Electron main sends the tag it received via the
     * enriched notify() payload). BroadcastChannel doesn't roundtrip to the same context, so
     * desktop can't reuse the SW-style channel — it calls this directly instead.
     */
    public async openChatFromNotificationClick(chatRoomId: string): Promise<void> {
        await this.handleMessageNotification(chatRoomId);
    }

    private async handleMessageNotification(chatRoomId: string) {
        chatVisibilityStore.set(true);
        let room: ChatRoom | undefined;
        if (chatRoomId.startsWith("proximity:")) {
            this.proximityMeetingStore.set(true);
            room = gameManager.getCurrentGameScene().proximityChatRoomManager.getRoomById(chatRoomId);
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
