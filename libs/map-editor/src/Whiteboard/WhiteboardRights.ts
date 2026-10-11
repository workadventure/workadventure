import type { AreaData } from "../types";

export interface WhiteboardRights {
    canRead: boolean;
    canWrite: boolean;
}

/**
 * The rights on the whiteboard of an area follow the area's "rights" property, read like the map editor does
 * (GameMapAreas): its readTags and writeTags let you in, its writeTags let you draw. A zone that only
 * restricts who comes in (no writeTags) lets everybody who is in draw, rather than nobody.
 */
export function getWhiteboardRights(area: AreaData, userTags: string[]): WhiteboardRights {
    const rights = area.properties.find((property) => property.type === "restrictedRightsPropertyData");
    if (rights === undefined || (rights.readTags.length === 0 && rights.writeTags.length === 0)) {
        return { canRead: true, canWrite: true };
    }
    const hasTag = (tags: string[]) => tags.some((tag) => userTags.includes(tag));
    const canRead = hasTag(rights.readTags) || hasTag(rights.writeTags);
    const canWrite = canRead && (rights.writeTags.length === 0 || hasTag(rights.writeTags));
    return { canRead, canWrite };
}
