import { SayMessageType } from "@workadventure/messages";
import { RoomConnection } from "../../../Connection/RoomConnection";
import { hasMovedEventName, Player } from "../../Player/Player";

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
            this.currentPlayer.once(hasMovedEventName, () => {
                if (this.bubbleDestroyTimeout) {
                    clearTimeout(this.bubbleDestroyTimeout);
                    this.bubbleDestroyTimeout = undefined;
                }
                player.say("", type);
                this.roomConnection.emitPlayerSayMessage({ message: "", type });
            });
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
