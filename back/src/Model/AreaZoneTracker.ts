import type { AreaData, AreaDataProperty, WAMFileFormat } from "@workadventure/map-editor";

import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type { GameRoom } from "./GameRoom";

interface TrackedAreaEntry {
    area: AreaData;
    propertyId: string;
    propertyType: AreaDataProperty["type"];
}

export interface EnterLeaveAreaEvent {
    area: AreaData;
}

/**
 * Tracks WAM areas that have event-driven properties (e.g. lockable).
 * Used to detect when a user leaves an area by movement and trigger "area empty" logic
 * (e.g. unlock) without modifying the grid Zone / PositionNotifier.
 */
export class AreaZoneTracker {
    private readonly trackedAreas = new Map<string, TrackedAreaEntry>();
    private readonly propertyTypesSet = new Set<AreaDataProperty["type"]>();
    //private readonly eventSubscriptions: Record<AreaDataProperty['type'], Subscription>,
    private readonly eventSubscriptions: {
        [key in AreaDataProperty["type"]]?: {
            enter?: Subject<EnterLeaveAreaEvent>;
            leave?: Subject<EnterLeaveAreaEvent>;
        };
    } = {};

    public constructor(gameRoom: GameRoom) {
        // No need to unsubscribe since these streams are completed when the room is destroyed.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        gameRoom.userLeaveStream.subscribe((user) => {
            for (const entry of this.trackedAreas.values()) {
                const wasInside = AreaZoneTracker.isPositionInArea(user.getPosition(), entry.area);

                if (wasInside) {
                    this.eventSubscriptions[entry.propertyType]?.leave?.next({ area: entry.area });
                }
            }
        });

        // No need to unsubscribe since these streams are completed when the room is destroyed.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        gameRoom.userMoveStream.subscribe(({ user, oldPosition }) => {
            for (const entry of this.trackedAreas.values()) {
                const wasInside = AreaZoneTracker.isPositionInArea(oldPosition, entry.area);
                const isInside = AreaZoneTracker.isPositionInArea(user.getPosition(), entry.area);

                if (!wasInside && isInside) {
                    this.eventSubscriptions[entry.propertyType]?.enter?.next({ area: entry.area });
                } else if (wasInside && !isInside) {
                    this.eventSubscriptions[entry.propertyType]?.leave?.next({ area: entry.area });
                }
            }
        });
    }

    /**
     * (Re)builds the list of tracked areas from the WAM.
     * Keeps only areas that have at least one property of a tracked type (e.g. lockable).
     */
    public refreshFromWam(wam: WAMFileFormat): void {
        this.trackedAreas.clear();

        for (const area of wam.areas) {
            for (const property of area.properties) {
                const propertyId = property.id;
                const propertyType = property.type;
                if (propertyType && this.propertyTypesSet.has(propertyType)) {
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
        // TODO: the gameRoom should publish an event we listen to here.
        if (updatedArea === null) {
            this.trackedAreas.delete(areaId);
            return;
        }

        const existing = this.trackedAreas.get(areaId);
        if (!existing) {
            for (const property of updatedArea.properties) {
                const propertyType = property.type;
                const propertyId = property.id;
                if (propertyType && this.propertyTypesSet.has(propertyType)) {
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
     * Registers a callback to be called when a user enters or leaves an area with a property of the given type.
     * IMPORTANT: this must be called before the WAM file is loaded.
     */
    public registerEventListener(
        eventType: "enter" | "leave",
        propertyType: AreaDataProperty["type"]
    ): Observable<EnterLeaveAreaEvent> {
        this.propertyTypesSet.add(propertyType);

        this.eventSubscriptions[propertyType] = this.eventSubscriptions[propertyType] || {};
        if (this.eventSubscriptions[propertyType][eventType]) {
            return this.eventSubscriptions[propertyType][eventType].asObservable();
        } else {
            this.eventSubscriptions[propertyType][eventType] = new Subject();
            return this.eventSubscriptions[propertyType][eventType].asObservable();
        }
    }
}
