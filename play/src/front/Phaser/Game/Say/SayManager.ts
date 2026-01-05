import { SayMessageType } from "@workadventure/messages";
import type { RoomConnection } from "../../../Connection/RoomConnection";
import type { Player } from "../../Player/Player";
import { hasMovedEventName } from "../../Player/Player";
import type { HasPlayerMovedInterface } from "../../../Api/Events/HasPlayerMovedInterface";

let lastSayPopupCloseDate: number | undefined = undefined;

export function popupJustClosed(): void {
    lastSayPopupCloseDate = Date.now();
}

export function isPopupJustClosed(): boolean {
    if (lastSayPopupCloseDate) {
        const timeSinceLastClose = Date.now() - lastSayPopupCloseDate;
        return timeSinceLastClose < 500;
    }
    return false;
}

export class SayManager {
    private bubbleDestroyTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    public constructor(private roomConnection: RoomConnection, private currentPlayer: Player) {}

    public say(text: string, type: SayMessageType, duration: number | undefined): void {
        if (this.bubbleDestroyTimeout) {
            clearTimeout(this.bubbleDestroyTimeout);
            this.bubbleDestroyTimeout = undefined;
        }

        const player = this.currentPlayer;
        player.say(text, type);
        this.roomConnection.emitPlayerSayMessage({ message: text, type });

        if (type === SayMessageType.ThinkingCloud) {
            const cancelThink = (event: HasPlayerMovedInterface) => {
                if (!event.moving) {
                    return;
                }
                if (this.bubbleDestroyTimeout) {
                    clearTimeout(this.bubbleDestroyTimeout);
                    this.bubbleDestroyTimeout = undefined;
                }
                player.say("", type);
                this.roomConnection.emitPlayerSayMessage({ message: "", type });
                this.currentPlayer.off(hasMovedEventName, cancelThink);
            };

            this.currentPlayer.on(hasMovedEventName, cancelThink);
        }

        if (duration) {
            this.bubbleDestroyTimeout = setTimeout(() => {
                player.say("", type);
                this.roomConnection.emitPlayerSayMessage({ message: "", type });
            }, duration);
        }
    }

    public close(): void {
        if (this.bubbleDestroyTimeout) {
            clearTimeout(this.bubbleDestroyTimeout);
            this.bubbleDestroyTimeout = undefined;
        }
    }
}
