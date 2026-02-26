import type { AreaData, AreaDataProperty } from "@workadventure/map-editor";

import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type { GameRoom } from "./GameRoom";

type AreaZoneTrackerGameRoom = Pick<GameRoom, "userLeaveStream" | "userMoveStream" | "getWamManager" | "getUsers">;

/**
 * Tracks WAM areas that have event-driven properties (e.g. lockable).
 * Used to detect when a user leaves an area by movement and trigger "area empty" logic
 * (e.g. unlock) without modifying the grid Zone / PositionNotifier.
 */
export class AreaZoneTracker {
    private readonly trackedAreas = new Map<string, { area: AreaData; propertyTypes: Set<AreaDataProperty["type"]> }>();
    private readonly propertyTypesSet = new Set<AreaDataProperty["type"]>();
    private readonly eventSubscriptions: {
        [key in AreaDataProperty["type"]]?: {
            enter?: Subject<AreaData>;
            leave?: Subject<AreaData>;
        };
    } = {};

    public constructor(private gameRoom: AreaZoneTrackerGameRoom) {
        // No need to unsubscribe since GameRoom.destroy completes this stream.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        gameRoom.userLeaveStream.subscribe((user) => {
            for (const { area, propertyTypes } of this.trackedAreas.values()) {
                const wasInside = AreaZoneTracker.isPositionInArea(user.getPosition(), area);

                if (wasInside) {
                    for (const propertyType of propertyTypes) {
                        this.eventSubscriptions[propertyType]?.leave?.next(area);
                    }
                }
            }
        });

        // No need to unsubscribe since GameRoom.destroy completes this stream.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        gameRoom.userMoveStream.subscribe(({ user, oldPosition }) => {
            for (const { area, propertyTypes } of this.trackedAreas.values()) {
                const wasInside = AreaZoneTracker.isPositionInArea(oldPosition, area);
                const isInside = AreaZoneTracker.isPositionInArea(user.getPosition(), area);

                for (const propertyType of propertyTypes) {
                    if (!wasInside && isInside) {
                        this.eventSubscriptions[propertyType]?.enter?.next(area);
                    } else if (wasInside && !isInside) {
                        this.eventSubscriptions[propertyType]?.leave?.next(area);
                    }
                }
            }
        });

        const wamManager = gameRoom.getWamManager();
        if (wamManager) {
            // No need to unsubscribe since WamManager.destroy completes this stream.
            // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
            wamManager.areaUpdated$.subscribe(({ areaId, area, previousArea, geometryChanged, propertiesChanged }) => {
                const previousTrackedPropertyTypes = this.getTrackedPropertyTypes(previousArea);
                const updatedTrackedPropertyTypes = this.getTrackedPropertyTypes(area);

                if (geometryChanged || propertiesChanged) {
                    this.emitEventsForUpdatedArea(
                        previousArea,
                        area,
                        previousTrackedPropertyTypes,
                        updatedTrackedPropertyTypes
                    );
                }

                this.refreshTrackedArea(areaId, area, updatedTrackedPropertyTypes);
            });
            // No need to unsubscribe since WamManager.destroy completes this stream.
            // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
            wamManager.areaDeleted$.subscribe(({ areaId }) => {
                this.trackedAreas.delete(areaId);
            });
        }
    }

    private refreshTrackedArea(
        areaId: string,
        updatedArea: AreaData,
        trackedPropertyTypes: Set<AreaDataProperty["type"]> = this.getTrackedPropertyTypes(updatedArea)
    ): void {
        if (trackedPropertyTypes.size === 0) {
            this.trackedAreas.delete(areaId);
            return;
        }

        this.trackedAreas.set(areaId, {
            area: { ...updatedArea },
            propertyTypes: trackedPropertyTypes,
        });
    }

    private getTrackedPropertyTypes(area: AreaData): Set<AreaDataProperty["type"]> {
        const trackedPropertyTypes = new Set<AreaDataProperty["type"]>();
        for (const property of area.properties) {
            const propertyType = property.type;
            if (propertyType && this.propertyTypesSet.has(propertyType)) {
                trackedPropertyTypes.add(propertyType);
            }
        }
        return trackedPropertyTypes;
    }

    private emitEventsForUpdatedArea(
        previousArea: AreaData,
        updatedArea: AreaData,
        previousTrackedPropertyTypes: Set<AreaDataProperty["type"]>,
        updatedTrackedPropertyTypes: Set<AreaDataProperty["type"]>
    ): void {
        const allTrackedPropertyTypes = new Set<AreaDataProperty["type"]>([
            ...previousTrackedPropertyTypes,
            ...updatedTrackedPropertyTypes,
        ]);

        if (allTrackedPropertyTypes.size === 0) {
            return;
        }

        for (const user of this.gameRoom.getUsers().values()) {
            const userPosition = user.getPosition();
            const wasInside = AreaZoneTracker.isPositionInArea(userPosition, previousArea);
            const isInside = AreaZoneTracker.isPositionInArea(userPosition, updatedArea);

            for (const propertyType of allTrackedPropertyTypes) {
                const wasTracked = previousTrackedPropertyTypes.has(propertyType);
                const isTracked = updatedTrackedPropertyTypes.has(propertyType);

                if (!wasTracked && isTracked && isInside) {
                    this.eventSubscriptions[propertyType]?.enter?.next(updatedArea);
                } else if (wasTracked && !isTracked && wasInside) {
                    this.eventSubscriptions[propertyType]?.leave?.next(updatedArea);
                } else if (wasTracked && isTracked) {
                    if (!wasInside && isInside) {
                        this.eventSubscriptions[propertyType]?.enter?.next(updatedArea);
                    } else if (wasInside && !isInside) {
                        this.eventSubscriptions[propertyType]?.leave?.next(updatedArea);
                    }
                }
            }
        }
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
     * Registers a callback to be called when a user enters or leaves an area with a property of the given type.
     * IMPORTANT: this must be called before the WAM file is loaded.
     */
    public registerEventListener(
        eventType: "enter" | "leave",
        propertyType: AreaDataProperty["type"]
    ): Observable<AreaData> {
        this.propertyTypesSet.add(propertyType);

        if (this.eventSubscriptions[propertyType] === undefined) {
            this.eventSubscriptions[propertyType] = {};

            // Let's track all areas with this property type
            const gameMapAreas = this.gameRoom.getWamManager()?.getWamFile().getGameMapAreas();
            if (gameMapAreas) {
                for (const [areaId, area] of gameMapAreas.getAreas().entries()) {
                    this.refreshTrackedArea(areaId, area);
                }
            }
        }

        this.eventSubscriptions[propertyType] = this.eventSubscriptions[propertyType] || {};
        if (this.eventSubscriptions[propertyType][eventType]) {
            return this.eventSubscriptions[propertyType][eventType].asObservable();
        } else {
            this.eventSubscriptions[propertyType][eventType] = new Subject();
            return this.eventSubscriptions[propertyType][eventType].asObservable();
        }
    }
}
