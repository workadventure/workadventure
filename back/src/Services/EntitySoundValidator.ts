import type { PlayAudioPropertyData, WAMFileFormat } from "@workadventure/map-editor";
import { findBroadcastablePlayAudioProperty as findInProperties } from "@workadventure/map-editor";

/**
 * Resolves the entity in the room's WAM, then checks that it really carries the sound being asked
 * for. Returns the property that authorises the broadcast, or undefined when none does.
 */
export function findBroadcastablePlayAudioProperty(
    wam: WAMFileFormat | undefined,
    entityId: string,
    soundUrl: string,
): PlayAudioPropertyData | undefined {
    return findInProperties(wam?.entities[entityId]?.properties, soundUrl);
}
