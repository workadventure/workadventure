import type { Subscription } from "rxjs";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { GameScene } from "./GameScene";

export class EmoteManager {
    private subscription: Subscription;

    constructor(private scene: GameScene, private connection: RoomConnection) {
        this.subscription = connection.emoteEventMessageStream.subscribe((event) => {
            const actor = this.scene.MapPlayersByKey.get(event.actorUserId);
            if (actor) {
                actor.playEmote(event.emote);
            }
        });
    }

    destroy() {
        this.subscription.unsubscribe();
    }
}
