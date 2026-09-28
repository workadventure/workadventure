import type { EntityDataProperties, PlayAudioPropertyData } from "./types";

/**
 * Finds the property of an entity that authorises broadcasting the given sound to the whole map.
 *
 * A sound played for everyone is asked for by one client and relayed as is by the server, so the URL
 * carried by the message cannot be taken on trust: it would let anyone make a whole room download a
 * resource of their choosing. Each client matches it against the entity's own property before playing.
 */
export function findBroadcastablePlayAudioProperty(
    properties: EntityDataProperties | undefined,
    soundUrl: string,
): PlayAudioPropertyData | undefined {
    return properties?.find(
        (property): property is PlayAudioPropertyData =>
            property.type === "playAudio" && property.playForAllUsers === true && property.audioLink === soundUrl,
    );
}
