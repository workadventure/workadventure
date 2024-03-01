import { GameMapAreas } from "../GameMap/GameMapAreas";

export class EntityPermissions {
    constructor(
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit?: boolean
    ) {}

    public canEdit(entityCenterCoordinates: { x: number; y: number }): boolean {
        if (this.userCanEdit) {
            return true;
        }
        return this.isEntityInsideAreaWithUserWriteAccess(entityCenterCoordinates);
    }

    public canRead(entityCenterCoordinates: { x: number; y: number }): boolean {
        if (this.userCanEdit) {
            return true;
        }
        return this.isEntityInsideAreaWithUserReadAccess(entityCenterCoordinates);
    }

    private isEntityInsideAreaWithUserWriteAccess(entityCenterCoordinates: { x: number; y: number }) {
        return this.gameMapAreas.isUserHasWriteAccessOnAreaForEntityCoordinates(
            entityCenterCoordinates,
            this.userConnectedTags
        );
    }

    private isEntityInsideAreaWithUserReadAccess(entityCenterCoordinates: { x: number; y: number }) {
        return this.gameMapAreas.isUserHasReadAccessOnAreaForEntityCoordinates(
            entityCenterCoordinates,
            this.userConnectedTags
        );
    }
}
