import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";

import type { PointInterface } from "./Websocket/PointInterface";
import type { IAreaPropertyEventRoom } from "./AreaPropertyEvents/IAreaPropertyEventRoom";
import { areaPropertyEventManager } from "./AreaPropertyEvents/AreaPropertyEventManager";
import type { User } from "./User";

/**
 * Property type we track for "area empty" behaviour (e.g. unlock when last user leaves).
 * Must match the property types registered for "areaEmpty" in AreaPropertyEventManager.
 */
const TRACKED_PROPERTY_TYPES = ["lockableAreaPropertyData"];

interface TrackedAreaEntry {
    area: AreaData;
    propertyId: string;
    propertyType: string;
}

/**
 * Tracks WAM areas that have event-driven properties (e.g. lockable).
 * Used to detect when a user leaves an area by movement and trigger "area empty" logic
 * (e.g. unlock) without modifying the grid Zone / PositionNotifier.
 */
export class AreaZoneTracker {
    private readonly trackedAreas = new Map<string, TrackedAreaEntry>();

    /**
     * (Re)builds the list of tracked areas from the WAM.
     * Keeps only areas that have at least one property of a tracked type (e.g. lockable).
     */
    public refreshFromWam(wam: WAMFileFormat): void {
        this.trackedAreas.clear();
        const propertyTypesSet = new Set(TRACKED_PROPERTY_TYPES);

        for (const area of wam.areas) {
            for (const property of area.properties) {
                const propertyId = property.id;
                const propertyType = property.type;
                if (propertyType && propertyTypesSet.has(propertyType)) {
                    this.trackedAreas.set(area.id, {
                        area: { ...area },
                        propertyId,
                        propertyType,
                    });
                    break;
                }
            }
        }
    }

    /**
     * Updates or removes a tracked area after a geometry change (modifyAreaMessage).
     * Call when the WAM area has been updated or removed.
     */
    public onAreaGeometryChange(areaId: string, updatedArea: AreaData | null): void {
        if (updatedArea === null) {
            this.trackedAreas.delete(areaId);
            return;
        }

        const existing = this.trackedAreas.get(areaId);
        if (!existing) {
            const propertyTypesSet = new Set(TRACKED_PROPERTY_TYPES);
            for (const property of updatedArea.properties) {
                const propertyType = property.type;
                const propertyId = property.id;
                if (propertyType && propertyTypesSet.has(propertyType)) {
                    this.trackedAreas.set(areaId, {
                        area: { ...updatedArea },
                        propertyId,
                        propertyType,
                    });
                    break;
                }
            }
            return;
        }

        this.trackedAreas.set(areaId, {
            ...existing,
            area: { ...updatedArea },
        });
    }

    private static isPositionInArea(position: { x: number; y: number }, area: AreaData): boolean {
        return (
            position.x >= area.x &&
            position.x <= area.x + area.width &&
            position.y >= area.y &&
            position.y <= area.y + area.height
        );
    }

    /**
     * Called when a user moves. Detects which tracked areas were left (oldPosition inside,
     * newPosition outside) and for each such area runs the "area empty" logic (e.g. unlock
     * if no users remain and area is locked).
     */
    public onUserMoved(
        room: IAreaPropertyEventRoom,
        _user: User,
        oldPosition: PointInterface,
        newPosition: PointInterface,
        roomUrl?: string
    ): void {
        for (const entry of this.trackedAreas.values()) {
            const wasInside = AreaZoneTracker.isPositionInArea(oldPosition, entry.area);
            const isInside = AreaZoneTracker.isPositionInArea(newPosition, entry.area);
            if (!wasInside || isInside) {
                continue;
            }

            areaPropertyEventManager.applyAreaEmptyForArea(room, entry.area.id, entry.area, roomUrl);
        }
    }
}
