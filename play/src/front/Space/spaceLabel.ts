import { get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import { gameManager } from "../Phaser/Game/GameManager";
import type { SpaceInterface } from "./SpaceInterface";

/** A human name for a space, to tell spaces apart in the raise-hand picker and the raised-hands panel. */
export function spaceLabel(space: SpaceInterface): string {
    if (space.kind === "bubble") {
        return get(LL).actionbar.help.lock.bubbleLabel();
    }
    if (space.kind === "megaphone") {
        return get(LL).megaphone.modal.liveMessage.title();
    }
    // Meeting rooms and listener zones carry their display name on their proximity chat room.
    const room = get(gameManager.getCurrentGameScene().proximityChatRoomManager.roomsStore).find(
        (candidate) => candidate.getCurrentSpaceName() === space.getName(),
    );
    return room ? get(room.name) : space.getName();
}
