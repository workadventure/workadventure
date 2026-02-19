import type { AreaData, ListenerMegaphonePropertyData, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
import type { GameMapFrontWrapper } from "../GameMap/GameMapFrontWrapper";

export type ListenerEntry = { listenerArea: AreaData; listenerProperty: ListenerMegaphonePropertyData };

/**
 * Returns the speaker megaphone property for a given speaker area id, or undefined if not found.
 */
export function getSpeakerPropertyForAreaId(
    areas: Map<string, AreaData>,
    speakerAreaId: string
): SpeakerMegaphonePropertyData | undefined {
    const speakerArea = areas.get(speakerAreaId);
    if (!speakerArea) {
        return undefined;
    }
    const prop = speakerArea.properties.find((p): p is SpeakerMegaphonePropertyData => p.type === "speakerMegaphone");
    return prop;
}

/**
 * Builds listener entries from precomputed associated area ids (avoids scanning all areas).
 * Use when the trigger path already computed associatedAreaIds for the updated speaker zone.
 */
export function buildListenerEntriesFromAssociatedIds(
    areas: Map<string, AreaData>,
    isPlayerInArea: (areaId: string) => boolean,
    speakerAreaId: string,
    associatedAreaIds: string[]
): ListenerEntry[] {
    const entries: ListenerEntry[] = [];
    for (const areaId of associatedAreaIds) {
        const listenerArea = areas.get(areaId);
        if (!listenerArea || !isPlayerInArea(areaId)) {
            continue;
        }
        const listenerProperty = listenerArea.properties.find(
            (p): p is ListenerMegaphonePropertyData =>
                p.type === "listenerMegaphone" && p.speakerZoneName === speakerAreaId
        );
        if (listenerProperty) {
            entries.push({ listenerArea, listenerProperty });
        }
    }
    return entries;
}

/**
 * Returns listener areas that reference the given speaker area id and where the current player is inside.
 */
export function getListenerAreasReferencingSpeakerWherePlayerIs(
    areas: Map<string, AreaData>,
    isPlayerInArea: (areaId: string) => boolean,
    speakerAreaId: string
): ListenerEntry[] {
    const entries: ListenerEntry[] = [];
    for (const listenerArea of areas.values()) {
        const listenerProperty = listenerArea.properties.find(
            (p): p is ListenerMegaphonePropertyData =>
                p.type === "listenerMegaphone" && p.speakerZoneName === speakerAreaId
        );
        if (listenerProperty && isPlayerInArea(listenerArea.id)) {
            entries.push({ listenerArea, listenerProperty });
        }
    }
    return entries;
}

/**
 * Registers the megaphone-associated-areas resolvers on the given wrapper.
 * Speaker zone → listener zones that reference it; listener zone → its speaker zone.
 */
export function registerMegaphoneAssociatedAreasResolvers(
    wrapper: Pick<GameMapFrontWrapper, "registerAssociatedAreasResolver" | "getAreas">
): void {
    wrapper.registerAssociatedAreasResolver("speakerMegaphone", (area, getAreas) => {
        const areas = getAreas();
        return Array.from(areas.values())
            .filter((a) =>
                a.properties?.some(
                    (p): p is ListenerMegaphonePropertyData =>
                        p.type === "listenerMegaphone" && p.speakerZoneName === area.id
                )
            )
            .map((a) => a.id);
    });
    wrapper.registerAssociatedAreasResolver("listenerMegaphone", (area, _getAreas) => {
        const prop = area.properties?.find((p): p is ListenerMegaphonePropertyData => p.type === "listenerMegaphone");
        return prop ? [prop.speakerZoneName] : [];
    });
}
