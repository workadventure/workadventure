import { AreaData, AreaPermissions, AtLeast, GameMapAreas } from "@workadventure/map-editor";
import { Area } from "../../Entity/Area";
import { GameScene } from "../GameScene";
import { mapEditorActivatedForThematics } from "../../../Stores/MenuStore";
import { localUserStore } from "../../../Connection/LocalUserStore";

/**
 * This class handles the display
 * of Phaser Areas objects
 */
export class AreasManager {
    private areas: Area[] = [];
    private areaPermissions: AreaPermissions;

    constructor(
        private scene: GameScene,
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit: boolean
    ) {
        this.areaPermissions = new AreaPermissions(gameMapAreas, userConnectedTags, userCanEdit);
        this.initializeAreas();
    }

    public addArea(areaData: AreaData): void {
        this.areas.push(
            new Area(
                this.scene,
                areaData,
                this.areaPermissions.isUserHasAreaAccess(areaData.id),
                this.areaPermissions.isOverlappingArea(areaData.id)
            )
        );
        this.updateMapEditorOptionForSpecificAreas();
    }

    public updateArea(updatedArea: AtLeast<AreaData, "id">): void {
        const indexOfAreaToUpdate = this.areas.findIndex((area) => area.areaData.id === updatedArea.id);
        if (indexOfAreaToUpdate === -1) {
            console.error("Unable to find area to update : ", updatedArea.id);
            return;
        }
        const areaToUpdate = this.areas[indexOfAreaToUpdate];
        areaToUpdate.updateArea(updatedArea, !this.areaPermissions.isUserHasAreaAccess(updatedArea.id));
        this.updateMapEditorOptionForSpecificAreas();
    }

    public removeArea(deletedAreaId: string): void {
        const removedAreaIndex = this.areas.findIndex((area) => area.areaData.id === deletedAreaId);
        if (removedAreaIndex === -1) {
            console.error("Unable to find area to remove : ", deletedAreaId);
            return;
        }
        this.areas[removedAreaIndex].destroy();
        this.areas = this.areas.filter((area) => area.areaData.id === deletedAreaId);
        this.updateMapEditorOptionForSpecificAreas();
    }

    private initializeAreas() {
        const gameMapAreas = this.gameMapAreas.getAreas();
        gameMapAreas.forEach((areaData) =>
            this.areas.push(
                new Area(
                    this.scene,
                    areaData,
                    !this.areaPermissions.isUserHasAreaAccess(areaData.id),
                    this.areaPermissions.isOverlappingArea(areaData.id)
                )
            )
        );
        this.updateMapEditorOptionForSpecificAreas();
    }

    private updateMapEditorOptionForSpecificAreas() {
        const userId = localUserStore.getLocalUser()?.uuid;
        const userTags = this.scene.connection?.getAllTags() ?? [];
        const isGameMapHasSpecificAreas = this.gameMapAreas.isGameMapContainsSpecificAreas(userId, userTags);
        mapEditorActivatedForThematics.set(isGameMapHasSpecificAreas);
    }

    public getAreaById(areaId: string): Area | undefined {
        return this.areas.find((area) => area.areaData.id === areaId);
    }

    public getAreasByPropertyType(propertyType: string): Area[] {
        return this.areas.reduce((areas, area) => {
            const areaFound = area.areaData.properties.find((property) => property.type === propertyType);
            if (areaFound) {
                areas.push(area);
            }
            return areas;
        }, [] as Area[]);
    }

    /**
     * Returns the list of all areas that the user has no access to.
     */
    public getCollidingAreas(): AreaData[] {
        if (this.userCanEdit) {
            return [];
        }
        return this.gameMapAreas.getCollidingAreas(this.userConnectedTags);
    }
}
