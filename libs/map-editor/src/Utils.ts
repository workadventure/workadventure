import { v4 } from "uuid";
import type { AreaData } from "./types";
import { SpeakerMegaphonePropertyData } from "./types";

export function getSpeakerMegaphoneAreaName(
    areas: Map<string, AreaData> = new Map(),
    areaId: string,
): string | undefined {
    for (const area of areas.values()) {
        const speakerMegaphonePropertyRaw = area.properties.find((property) => property.type === "speakerMegaphone");
        if (speakerMegaphonePropertyRaw) {
            const speakerMegaphoneProperty = SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
            if (speakerMegaphoneProperty.success && area.id === areaId) {
                return speakerMegaphoneProperty.data.name;
            }
        }
    }
    return undefined;
}

/**
 * Retrieves both the speaker megaphone area's name and its seeAttendees value, given an area ID.
 * @param areas Map of area ID to AreaData.
 * @param areaId The target area ID to look up.
 * @returns An object with `name` and `seeAttendees` if found, otherwise undefined.
 */
export function getSpeakerMegaphoneAreaInfo(
    areas: Map<string, AreaData> = new Map(),
    areaId: string,
): { name: string; seeAttendees: boolean } | undefined {
    for (const area of areas.values()) {
        if (area.id !== areaId) {
            continue;
        }
        const property = area.properties.find((property) => property.type === "speakerMegaphone");
        if (!property) {
            return undefined;
        }

        return {
            name: property.name,
            seeAttendees: property.seeAttendees,
        };
    }
    return undefined;
}

/**
 * Deep-copies the properties of an area or entity for its copy, giving each one a new id. Uploaded files, unnamed
 * meeting rooms and the property editors are keyed by property id: a copy keeping the ids would share them.
 */
export function withNewPropertyIds<T extends { id: string }>(properties: T[]): T[] {
    return structuredClone(properties).map((property) => ({ ...property, id: v4() }));
}
