import { RoomConnection } from "../../../Connection/RoomConnection";
import { Player } from "../../Player/Player";

export class SayManager {
    private bubbleDestroyTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    public constructor(private roomConnection: RoomConnection, private currentPlayer: Player) {}

    public say(text: string, duration: number | undefined): void {
        if (this.bubbleDestroyTimeout) {
            clearTimeout(this.bubbleDestroyTimeout);
            this.bubbleDestroyTimeout = undefined;
        }

        const player = this.currentPlayer;
        player.say(text);
        this.roomConnection.emitPlayerSayMessage({ message: text });

        if (duration) {
            this.bubbleDestroyTimeout = setTimeout(() => {
                player.say("");
                this.roomConnection.emitPlayerSayMessage({ message: "" });
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
