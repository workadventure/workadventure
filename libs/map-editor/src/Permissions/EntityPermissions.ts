import { GameMapAreas } from "../GameMap/GameMapAreas";
import { EntityCoordinates } from "../types";

export class EntityPermissions {
    constructor(
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit?: boolean
    ) {}

    public canEdit(entityCenterCoordinates: EntityCoordinates): boolean {
        if (this.userCanEdit) {
            return true;
        }
        return this.isEntityInsideAreaWithUserWriteAccess(entityCenterCoordinates);
    }

    public canRead(entityCenterCoordinates: EntityCoordinates): boolean {
        if (this.userCanEdit) {
            return true;
        }
        return this.isEntityInsideAreaWithUserReadAccess(entityCenterCoordinates);
    }

    private isEntityInsideAreaWithUserWriteAccess(entityCenterCoordinates: EntityCoordinates) {
        return this.gameMapAreas.isUserHasWriteAccessOnAreaForEntityCoordinates(
            entityCenterCoordinates,
            this.userConnectedTags
        );
    }

    private isEntityInsideAreaWithUserReadAccess(entityCenterCoordinates: EntityCoordinates) {
        return this.gameMapAreas.isUserHasReadAccessOnAreaForEntityCoordinates(
            entityCenterCoordinates,
            this.userConnectedTags
        );
    }
}
