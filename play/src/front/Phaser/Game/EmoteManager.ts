import type { Subscription } from "rxjs";
import { isWokaEmoteId } from "@workadventure/shared-utils";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { GameScene } from "./GameScene";

export class EmoteManager {
    private subscription: Subscription;

    constructor(
        private scene: GameScene,
        private connection: RoomConnection,
    ) {
        this.subscription = connection.emoteEventMessageStream.subscribe((event) => {
            const actor = this.scene.MapPlayersByKey.get(event.actorUserId);
            if (!actor) {
                return;
            }
            // The back validates the identifier before relaying it, but an older back that does not
            // know about Woka emotes would forward nothing here, and a newer one could name an
            // animation this client has not shipped yet.
            if (event.wokaEmoteId !== undefined && isWokaEmoteId(event.wokaEmoteId)) {
                actor.playWokaEmote(event.wokaEmoteId);
                return;
            }
            if (event.emote) {
                actor.playEmote(event.emote);
            }
        });
    }

    destroy() {
        this.subscription.unsubscribe();
    }
}
