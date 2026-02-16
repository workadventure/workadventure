import { get } from "svelte/store";
import type { AreaData, AtLeast, GameMapAreas } from "@workadventure/map-editor";
import { AreaPermissions } from "@workadventure/map-editor";
import { Area } from "../../Entity/Area";
import type { GameScene } from "../GameScene";
import { mapEditorActivatedForThematics } from "../../../Stores/MenuStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { personalAreaDataStore } from "../../../Stores/PersonalDeskStore";

/**
 * This class handles the display
 * of Phaser Areas objects
 */
export class AreasManager {
    private areas = new Map<string, Area>();
    private areaPermissions: AreaPermissions;

    constructor(
        private scene: GameScene,
        private gameMapAreas: GameMapAreas,
        private userConnectedTags: string[],
        private userCanEdit: boolean,
        private _personalAreaDataStore = personalAreaDataStore
    ) {
        this.areaPermissions = new AreaPermissions(gameMapAreas, userConnectedTags, userCanEdit);
        this.initializeAreas();
    }

    public addArea(areaData: AreaData): void {
        this.areas.set(
            areaData.id,
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
        const areaToUpdate = this.areas.get(updatedArea.id);
        if (!areaToUpdate) {
            console.error("Unable to find area to update : ", updatedArea.id);
            return;
        }
        areaToUpdate.updateArea(updatedArea, !this.areaPermissions.isUserHasAreaAccess(updatedArea.id));
        this.updateMapEditorOptionForSpecificAreas();

        const userUUID = localUserStore.getLocalUser()?.uuid;
        const personalAreaData = get(this._personalAreaDataStore);

        if (!personalAreaData || personalAreaData.id !== updatedArea.id) {
            return;
        }

        if (userUUID && !this.gameMapAreas.isAreaOwner(areaToUpdate.areaData, userUUID)) {
            this._personalAreaDataStore.set(null);
        }
    }

    public removeArea(deletedAreaId: string): void {
        const areaToRemove = this.areas.get(deletedAreaId);
        if (!areaToRemove) {
            console.error("Unable to find area to remove : ", deletedAreaId);
            return;
        }
        areaToRemove.destroy();
        this.areas.delete(deletedAreaId);
        this.updateMapEditorOptionForSpecificAreas();
    }

    private initializeAreas() {
        const gameMapAreas = this.gameMapAreas.getAreas();
        const userUUID = localUserStore.getLocalUser()?.uuid;
        gameMapAreas.forEach((areaData) => {
            if (userUUID && this.gameMapAreas.isAreaOwner(areaData, userUUID)) {
                this._personalAreaDataStore.set(areaData);
            }

            this.areas.set(
                areaData.id,
                new Area(
                    this.scene,
                    areaData,
                    !this.areaPermissions.isUserHasAreaAccess(areaData.id),
                    this.areaPermissions.isOverlappingArea(areaData.id)
                )
            );
        });
        this.updateMapEditorOptionForSpecificAreas();
    }

    private updateMapEditorOptionForSpecificAreas() {
        const userId = localUserStore.getLocalUser()?.uuid;
        const userTags = this.scene.connection?.getAllTags() ?? [];
        const isGameMapHasSpecificAreas = this.gameMapAreas.isGameMapContainsSpecificAreas(userId, userTags);
        mapEditorActivatedForThematics.set(isGameMapHasSpecificAreas);
    }

    public getAreaById(areaId: string): Area | undefined {
        return this.areas.get(areaId);
    }

    public getAreasByPropertyType(propertyType: string): Area[] {
        return Array.from(this.areas.values()).reduce((areas, area) => {
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
