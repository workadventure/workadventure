import { get } from "svelte/store";
import { userIsAdminStore, userIsEditorStore } from "../../Stores/GameStore";
import { GameScene } from "../Game/GameScene";

export class EntityPermissions {
    constructor(private scene: GameScene) {}

    public isAllowedToPlaceEntityOnMap(entityCenterCoordinates: { x: number; y: number }): boolean {
        if (get(userIsAdminStore) || get(userIsEditorStore)) {
            return true;
        }

        const gameMapAreas = this.scene?.getGameMap()?.getGameMapAreas();
        const areas = gameMapAreas?.getAreasOnPosition(entityCenterCoordinates);
        if (areas?.length === 0) {
            return false;
        }
        const userTags = this.scene.connection?.getTags() ?? [];
        return areas!.some((area) => gameMapAreas?.isUserHasWriteAccessOnAreaByTags(area, userTags));
    }
}
