import type { EntityDataProperties, PlayAudioPropertyData } from "./types";

/**
 * Finds the property of an entity that authorises broadcasting the given sound to the whole map.
 *
 * A sound played for everyone is asked for by one client and fetched by all the others, so the URL
 * carried by the message cannot be taken on trust: it would let anyone make a whole room download a
 * resource of their choosing. Both the server, before relaying, and each client, before playing,
 * match it against the entity's own property, which is why this rule lives in a single place.
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
