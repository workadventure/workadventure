import { GameMapAreas } from "../GameMap/GameMapAreas";

export class AreaPermissions {
    constructor(
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit?: boolean
    ) {}

    public isUserHasAreaAccess(areaId: string): boolean {
        if (this.userCanEdit === true) {
            return true;
        }
        return this.gameMapAreas.isUserHasAreaAccess(areaId, this.userConnectedTags);
    }

    public isOverlappingArea(areaId: string): boolean {
        return this.gameMapAreas.isOverlappingArea(areaId);
    }
}
