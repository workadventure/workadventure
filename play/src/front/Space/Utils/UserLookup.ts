import { gameManager } from "../../Phaser/Game/GameManager";
import type { SpaceInterface, SpaceUserExtended } from "../SpaceInterface";

export function lookupUserById(id: number, space: SpaceInterface): SpaceUserExtended | undefined {
    const spaceUserId = gameManager.getCurrentGameScene().roomUrl + "_" + id;
    return space.getSpaceUserBySpaceUserId(spaceUserId);
}
