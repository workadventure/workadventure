import { AreaData, AreaPermissions, AtLeast, GameMapAreas } from "@workadventure/map-editor";
import { Area } from "../../Entity/Area";
import { GameScene } from "../GameScene";

export class AreasManager {
    private areas: Area[] = [];
    //private areaColliders: Map<string, Phaser.Physics.Arcade.Collider> = new Map();
    private areaPermissions: AreaPermissions;

    constructor(
        private scene: GameScene,
        private gameMapAreas: GameMapAreas,
        userConnectedTags: string[],
        userCanEdit: boolean
    ) {
        this.areaPermissions = new AreaPermissions(gameMapAreas, userConnectedTags, userCanEdit);
        this.initializeAreas();
    }

    private initializeAreas() {
        const gameMapAreas = this.gameMapAreas.getAreas();
        gameMapAreas.forEach((areaData) =>
            this.areas.push(new Area(this.scene, areaData, !this.areaPermissions.isUserHasAreaAccess(areaData.id)))
        );
    }

    public addArea(areaData: AreaData): void {
        this.areas.push(new Area(this.scene, areaData, this.areaPermissions.isUserHasAreaAccess(areaData.id)));
    }

    public updateArea(updatedArea: AtLeast<AreaData, "id">): void {
        const indexOfAreaToUpdate = this.areas.findIndex((area) => area.areaData.id === updatedArea.id);
        if (indexOfAreaToUpdate === -1) {
            console.error("Unable to find area to update : ", updatedArea.id);
            return;
        }
        const areaToUpdate = this.areas[indexOfAreaToUpdate];
        areaToUpdate.updateArea(updatedArea, !this.areaPermissions.isUserHasAreaAccess(updatedArea.id));
    }

    public removeArea(deletedAreaId: string): void {
        const removedAreaIndex = this.areas.findIndex((area) => area.areaData.id === deletedAreaId);
        if (removedAreaIndex === -1) {
            console.error("Unable to find area to remove : ", deletedAreaId);
            return;
        }
        this.areas[removedAreaIndex].destroy();
        this.areas = this.areas.filter((area) => area.areaData.id === deletedAreaId);
    }
}
