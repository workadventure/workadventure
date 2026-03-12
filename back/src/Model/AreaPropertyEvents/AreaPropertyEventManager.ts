import * as Sentry from "@sentry/node";
import type { AreaData } from "@workadventure/map-editor";
import { asError } from "catch-unknown";
import { z } from "zod";
import type { PointInterface } from "../Websocket/PointInterface";
import type { IAreaPropertyEventRoom } from "./IAreaPropertyEventRoom";

const areaGeometryChangePropertySchema = z.object({
    type: z.string(),
    id: z.string(),
});

export type AreaPropertyEventType = "areaEmpty" | "areaGeometryChange";

export interface AreaPropertyEventDescriptor {
    propertyType: string;
    variableKey: string;
    value: string;
    onlyIfValue?: string;
}

export class AreaPropertyEventManager {
    private readonly descriptorsByEvent = new Map<AreaPropertyEventType, AreaPropertyEventDescriptor[]>();

    public register(eventType: AreaPropertyEventType, descriptor: AreaPropertyEventDescriptor): void {
        const list = this.descriptorsByEvent.get(eventType) ?? [];
        list.push(descriptor);
        this.descriptorsByEvent.set(eventType, list);
    }

    public async applyAreaEmpty(
        room: IAreaPropertyEventRoom,
        position: PointInterface,
        roomUrl?: string
    ): Promise<void> {
        try {
            const descriptors = this.descriptorsByEvent.get("areaEmpty");
            if (!descriptors || descriptors.length === 0) {
                return;
            }

            const propertyTypes = [...new Set(descriptors.map((d) => d.propertyType))];
            const areasToCheck = await room.getAreasWithPropertyTypesContainingPosition(position, propertyTypes);

            const wam = await room.getWam();
            if (!wam) {
                return;
            }

            for (const { areaId, propertyId, propertyType } of areasToCheck) {
                const descriptor = descriptors.find((d) => d.propertyType === propertyType);
                if (!descriptor) {
                    continue;
                }

                const currentValue = room.getAreaPropertyVariable(areaId, propertyId, descriptor.variableKey);
                if (descriptor.onlyIfValue !== undefined && currentValue !== descriptor.onlyIfValue) {
                    continue;
                }

                const area = wam.areas.find((a: AreaData) => a.id === areaId);
                if (!area) {
                    continue;
                }

                if (!room.hasUsersInArea(area)) {
                    room.setAreaPropertyVariable(areaId, propertyId, descriptor.variableKey, descriptor.value);
                }
            }
        } catch (err: unknown) {
            Sentry.captureException(asError(err), {
                tags: { context: "applyAreaEmpty", roomUrl: roomUrl ?? "unknown" },
            });
        }
    }

    /**
     * Applies "area empty" logic for a single area (e.g. unlock if empty and locked).
     * Used by AreaZoneTracker when a user leaves an area by movement.
     */
    public applyAreaEmptyForArea(room: IAreaPropertyEventRoom, areaId: string, area: AreaData, roomUrl?: string): void {
        try {
            const descriptors = this.descriptorsByEvent.get("areaEmpty");
            if (!descriptors || descriptors.length === 0) {
                return;
            }

            if (room.hasUsersInArea(area)) {
                return;
            }

            for (const property of area.properties) {
                const propType = property.type;
                const propId = property.id;

                const descriptor = descriptors.find((d) => d.propertyType === propType);
                if (!descriptor) {
                    continue;
                }

                const currentValue = room.getAreaPropertyVariable(areaId, propId, descriptor.variableKey);
                if (descriptor.onlyIfValue !== undefined && currentValue !== descriptor.onlyIfValue) {
                    continue;
                }

                room.setAreaPropertyVariable(areaId, propId, descriptor.variableKey, descriptor.value);
            }
        } catch (err: unknown) {
            Sentry.captureException(asError(err), {
                tags: {
                    context: "applyAreaEmptyForArea",
                    roomUrl: roomUrl ?? "unknown",
                },
            });
        }
    }

    public applyAreaGeometryChange(room: IAreaPropertyEventRoom, areaId: string, properties: unknown[]): void {
        const descriptors = this.descriptorsByEvent.get("areaGeometryChange");
        if (!descriptors || descriptors.length === 0) {
            return;
        }

        for (const raw of properties) {
            const result = areaGeometryChangePropertySchema.safeParse(raw);
            if (!result.success) {
                continue;
            }
            const { type: propertyType, id: propertyId } = result.data;

            const descriptor = descriptors.find((d) => d.propertyType === propertyType);
            if (!descriptor) {
                continue;
            }

            room.setAreaPropertyVariable(areaId, propertyId, descriptor.variableKey, descriptor.value);
        }
    }
}

export const areaPropertyEventManager = new AreaPropertyEventManager();
