import { MathUtils } from "@workadventure/math-utils";
import { errorHandler } from "@workadventure/shared-utils/src/ErrorHandler";
import * as _ from "lodash";
import {
    AreaData,
    AreaDataProperties,
    AreaDataProperty,
    AtLeast,
    EntityCoordinates,
    PersonalAreaPropertyData,
    RestrictedRightsPropertyData,
    WAMFileFormat,
} from "../types";

export type AreaChangeCallback = (
    areasChangedByAction: Array<AreaData>,
    allAreasOnNewPosition: Array<AreaData>
) => void;

export type AreaUpdateCallback = (
    area: AreaData,
    oldProperties: AreaDataProperties | undefined,
    newProperties: AreaDataProperties | undefined
) => void;

export class GameMapAreas {
    private wam: WAMFileFormat;
    private enterAreaCallbacks = Array<AreaChangeCallback>();
    private updateAreaCallbacks = Array<AreaUpdateCallback>();
    private leaveAreaCallbacks = Array<AreaChangeCallback>();

    /**
     * Areas created from within map-editor
     */
    private readonly areas: Map<string, AreaData> = new Map<string, AreaData>();
    private readonly areasPositionOffsetY: number = 16;

    constructor(wam: WAMFileFormat) {
        this.wam = wam;

        for (const areaData of this.wam.areas) {
            this.addArea(areaData, false);
        }
    }

    /**
     * @returns If there were any areas changes
     */
    public triggerAreasChange(
        oldPosition: { x: number; y: number } | undefined,
        position: { x: number; y: number } | undefined
    ): boolean {
        const areasByOldPosition = oldPosition ? this.getAreasOnPosition(oldPosition, this.areasPositionOffsetY) : [];
        const areasByNewPosition = position ? this.getAreasOnPosition(position, this.areasPositionOffsetY) : [];

        const enterAreas = new Set(areasByNewPosition);
        const leaveAreas = new Set(areasByOldPosition);

        enterAreas.forEach((area) => {
            if (leaveAreas.has(area)) {
                leaveAreas.delete(area);
                enterAreas.delete(area);
            }
        });

        let areasChange = false;
        if (enterAreas.size > 0) {
            const areasArray = Array.from(enterAreas);

            for (const callback of this.enterAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }

        if (leaveAreas.size > 0) {
            const areasArray = Array.from(leaveAreas);
            for (const callback of this.leaveAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }
        return areasChange;
    }

    public addArea(area: AreaData, addToWAM = true, playerPosition?: { x: number; y: number }): boolean {
        if (this.areas.has(area.id)) {
            return false;
        }
        this.areas.set(area.id, area);

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }

        if (addToWAM) {
            return this.addAreaToWAM(area);
        }
        return true;
    }

    public isUserHasWriteAccessOnAreaForEntityCoordinates(
        entityCenterCoordinates: EntityCoordinates,
        userConnectedTags: string[],
        userUUID = "",
        width: number,
        height: number,
        floating: boolean
    ): boolean {
        const areas = this.getAreasOnPosition(entityCenterCoordinates);
        const topLeftCoordinates = {
            x: entityCenterCoordinates.x - width / 2,
            y: entityCenterCoordinates.y - height / 2,
        };
        const bottomRightCoordinates = {
            x: entityCenterCoordinates.x + width / 2,
            y: entityCenterCoordinates.y + height / 2,
        };

        let validAreas: AreaData[] = areas;

        validAreas = areas.filter((area) => {
            if (
                MathUtils.isOverlappingWithRectangle(topLeftCoordinates, area) &&
                MathUtils.isOverlappingWithRectangle(bottomRightCoordinates, area)
            ) {
                return true;
            }
            return false;
        });

        if (validAreas?.length === 0) return false;
        return (
            validAreas.some((area) => this.isUserHasWriteAccessOnAreaByUserTags(area, userConnectedTags)) ||
            validAreas.some((area) => this.isAreaOwner(area, userUUID))
        );
    }

    public isUserHasReadAccessOnAreaForEntityCoordinates(
        entityCenterCoordinates: EntityCoordinates,
        userConnectedTags: string[]
    ): boolean {
        const areas = this.getAreasOnPosition(entityCenterCoordinates);
        if (areas?.length === 0) {
            return true;
        }
        return areas.some((area) => this.isUserHasReadAccessOnAreaByTags(area, userConnectedTags));
    }

    public isUserHasAreaAccess(areaId: string, userConnectedTags: string[]) {
        const area = this.getArea(areaId);
        if (area === undefined) {
            return true;
        }
        const areaRights = this.getAreaRightPropertyData(area);
        if (areaRights === undefined) {
            return true;
        }

        const areaRightTags = [...areaRights.writeTags, ...areaRights.readTags];
        return areaRightTags.some((tag) => userConnectedTags.includes(tag));
    }

    public hasAreaAccess(area: AreaData, userConnectedTags: string[]) {
        const areaRights = this.getAreaRightPropertyData(area);
        if (areaRights === undefined) {
            return true;
        }

        const areaRightTags = [...areaRights.writeTags, ...areaRights.readTags];
        return areaRightTags.some((tag) => userConnectedTags.includes(tag));
    }

    public isOverlappingArea(areaId: string): boolean {
        const area = this.getArea(areaId);
        if (area === undefined) {
            return false;
        }
        return this.getPersonalAreaRightPropertyData(area) != undefined;
    }

    public isGameMapContainsSpecificAreas(userId: string | undefined, tags: string[]): boolean {
        let hasSpecificAreas = false;
        this.areas.forEach((area) => {
            if (this.getAreaRightPropertyData(area) !== undefined) {
                if (this.isUserHasWriteAccessOnAreaByUserTags(area, tags)) {
                    hasSpecificAreas = true;
                    return;
                }
                return;
            }
            if (userId) {
                if (this.getPersonalAreaRightPropertyData(area) !== undefined) {
                    if (this.isAreaOwner(area, userId)) {
                        hasSpecificAreas = true;
                        return;
                    }
                    return;
                }
            }
        });
        return hasSpecificAreas;
    }

    public isPlayerInsideArea(id: string, playerPosition: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY).findIndex((area) => area.id === id) !==
            -1
        );
    }

    public isPlayerInsideAreaByName(name: string, position: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(position, this.areasPositionOffsetY).findIndex((area) => area.name === name) !== -1
        );
    }

    public updateArea(newConfig: AtLeast<AreaData, "id">): AreaData | undefined {
        const area = this.areas.get(newConfig.id);
        if (!area) {
            throw new Error(`Area to update does not exist!`);
        }

        const customMerge = (objValue: unknown, srcValue: unknown, key: string) => {
            if (key === "properties") {
                try {
                    const objValueParse = AreaDataProperties.safeParse(objValue);
                    const srcValueParse = AreaDataProperties.safeParse(srcValue);

                    if (!objValueParse.success && !srcValueParse.success) {
                        return undefined;
                    }

                    if (!objValueParse.success || !srcValueParse.success) {
                        return objValue ? objValue : srcValue;
                    }

                    return srcValueParse.data.map((newProp: AreaDataProperty) => {
                        const oldProp = objValueParse.data.find((prop: AreaDataProperty) => prop.id === newProp.id);

                        if (oldProp && oldProp.serverData) {
                            if (!newProp.serverData || JSON.stringify(newProp.serverData) === "{}") {
                                newProp.serverData = oldProp.serverData;
                            }
                        }
                        return newProp;
                    });
                } catch (error) {
                    console.error("Failed to parse properties : ", error);
                    errorHandler(new Error("Failed to parse area properties"));
                    return srcValue;
                }
            }
            return undefined;
        };

        _.mergeWith(area, newConfig, customMerge);

        this.updateAreaWAM(area);
        return area;
    }

    public deleteArea(id: string): boolean {
        const deleted = this.areas.delete(id);
        if (deleted) {
            return this.deleteAreaFromWAM(id);
        }
        return false;
    }

    public getAreas(): Map<string, AreaData> {
        return this.areas;
    }

    public getAreaByName(name: string): AreaData | undefined {
        return Array.from(this.areas.values()).find((area) => area.name === name);
    }

    public getArea(id: string): AreaData | undefined {
        return this.areas.get(id);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.enterAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when an area is update.
     */
    public onUpdateArea(callback: AreaUpdateCallback) {
        this.updateAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another area.
     */
    public onLeaveArea(callback: AreaChangeCallback) {
        this.leaveAreaCallbacks.push(callback);
    }

    public triggerSpecificAreaOnEnter(area: AreaData): void {
        for (const callback of this.enterAreaCallbacks) {
            callback([area], []);
        }
    }

    public triggerSpecificAreaOnUpdate(
        area: AreaData,
        oldProperties: AreaDataProperties | undefined,
        newProperties: AreaDataProperties | undefined
    ): void {
        for (const callback of this.updateAreaCallbacks) {
            callback(area, oldProperties, newProperties);
        }
    }

    public triggerSpecificAreaOnLeave(area: AreaData): void {
        for (const callback of this.leaveAreaCallbacks) {
            callback([area], []);
        }
    }

    public getAreasOnPosition(position: { x: number; y: number }, offsetY = 0): AreaData[] {
        const areasOfInterest = [...this.areas.values()];

        const overlappedAreas: AreaData[] = [];
        for (const area of areasOfInterest) {
            if (MathUtils.isOverlappingWithRectangle({ x: position.x, y: position.y + offsetY }, area)) {
                overlappedAreas.push(area);
            }
        }
        return overlappedAreas;
    }

    private isUserHasWriteAccessOnAreaByUserTags(area: AreaData, userTags: string[]): boolean {
        const areaRights = this.getAreaRightPropertyData(area);
        if (areaRights === undefined) {
            return false;
        }
        return areaRights.writeTags.some((tag) => userTags.includes(tag));
    }

    private isAreaOwner(area: AreaData, userUUID: string): boolean {
        const personalAreaRightPropertyData = this.getPersonalAreaRightPropertyData(area);
        if (personalAreaRightPropertyData === undefined) {
            return false;
        }
        return personalAreaRightPropertyData.ownerId === userUUID;
    }

    private isUserHasReadAccessOnAreaByTags(area: AreaData, userTags: string[]): boolean {
        const areaRights = this.getAreaRightPropertyData(area);
        if (areaRights === undefined) {
            return true;
        }
        return areaRights.readTags.some((tag) => userTags.includes(tag));
    }

    public isPersonalArea(areaId: string): boolean {
        const area = this.getArea(areaId);
        if (area) {
            const personalAreaData = this.getPersonalAreaRightPropertyData(area);
            if (personalAreaData !== undefined && personalAreaData.ownerId !== null) {
                {
                    return true;
                }
            }
        }
        return false;
    }

    private getAreaRightPropertyData(area: AreaData): RestrictedRightsPropertyData | undefined {
        const areaRightPropertyData = area.properties.find(
            (property) => property.type === "restrictedRightsPropertyData"
        );
        const areaRights = areaRightPropertyData
            ? RestrictedRightsPropertyData.parse(areaRightPropertyData)
            : undefined;
        if (areaRights !== undefined) {
            const rightTags = [...areaRights.writeTags, ...areaRights.readTags];
            if (rightTags.length === 0) {
                return;
            }
            return RestrictedRightsPropertyData.parse(areaRightPropertyData);
        }
        return;
    }

    private getPersonalAreaRightPropertyData(area: AreaData): PersonalAreaPropertyData | undefined {
        const personalAreaPropertyData = area.properties.find(
            (property) => property.type === "personalAreaPropertyData"
        );
        if (personalAreaPropertyData !== undefined) {
            return PersonalAreaPropertyData.parse(personalAreaPropertyData);
        }
        return;
    }

    private addAreaToWAM(areaData: AreaData): boolean {
        if (!this.wam.areas.find((area) => area.id === areaData.id)) {
            this.wam.areas.push(areaData);
        } else {
            console.warn(`ADD AREA FAIL: AREA OF ID ${areaData.id} ALREADY EXISTS WITHIN THE WAM FILE!`);
            return false;
        }
        return true;
    }

    private deleteAreaFromWAM(id: string): boolean {
        const index = this.wam.areas.findIndex((area) => area.id === id);
        if (index !== -1) {
            this.wam.areas.splice(index, 1);
            return true;
        }
        return false;
    }

    private updateAreaWAM(areaData: AreaData): boolean {
        const index = this.wam.areas.findIndex((area) => area.id === areaData.id);
        if (index !== -1) {
            this.wam.areas[index] = structuredClone(areaData);
            return true;
        }
        return false;
    }

    /**
     * Returns the list of all areas that the user has no access to.
     */
    public getCollidingAreas(userConnectedTags: string[]): AreaData[] {
        return Array.from(this.areas.values()).filter((area) => !this.hasAreaAccess(area, userConnectedTags));
    }
}
