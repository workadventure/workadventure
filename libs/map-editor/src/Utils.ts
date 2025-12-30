import type { AreaData } from "./types";
import { SpeakerMegaphonePropertyData } from "./types";

export function getSpeakerMegaphoneAreaName(
    areas: Map<string, AreaData> = new Map(),
    areaId: string
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

export function getShouldSeeAttendees(areas: Map<string, AreaData> = new Map(), areaId: string): boolean {
    for (const area of areas.values()) {
        const speakerMegaphonePropertyRaw = area.properties.find((property) => property.type === "speakerMegaphone");
        if (speakerMegaphonePropertyRaw) {
            const speakerMegaphoneProperty = SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
            if (speakerMegaphoneProperty.success && area.id === areaId) {
                return speakerMegaphoneProperty.data.seeAttendees;
            }
        }
    }
    return false;
}

/**
 * Retrieves both the speaker megaphone area's name and its seeAttendees value, given an area ID.
 * @param areas Map of area ID to AreaData.
 * @param areaId The target area ID to look up.
 * @returns An object with `name` and `seeAttendees` if found, otherwise undefined.
 */
export function getSpeakerMegaphoneAreaInfo(
    areas: Map<string, AreaData> = new Map(),
    areaId: string
): { name: string; seeAttendees: boolean } | undefined {
    for (const area of areas.values()) {
        if (area.id !== areaId) {
            continue;
        }
        const propertyRaw = area.properties.find((property) => property.type === "speakerMegaphone");
        if (!propertyRaw) {
            return undefined;
        }
        const parseResult = SpeakerMegaphonePropertyData.safeParse(propertyRaw);
        if (!parseResult.success) {
            return undefined;
        }
        return {
            name: parseResult.data.name,
            seeAttendees: parseResult.data.seeAttendees,
        };
    }
    return undefined;
}
