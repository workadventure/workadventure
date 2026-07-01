import { spaceKindSchema } from "@workadventure/messages";
import { MetadataProcessor } from "./MetadataProcessor";
import { processProximityPollMetadata, proximityPollMetadataPrefixes } from "./ProximityPollMetadataProcessor";
import { processProximityQAMetadata, proximityQAMetadataPrefixes } from "./ProximityQAMetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});

// A value outside the enum throws, and a rejected key is dropped rather than published.
// That is the whole check: the kind is the client's own claim about its space, read by
// the analytics and by labels the front shows itself, so a client that lies about it
// only spoils its own rows.
metadataProcessor.registerMetadataProcessor("spaceKind", (value) => {
    return Promise.resolve(spaceKindSchema.parse(value));
});

for (const prefix of proximityQAMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityQAMetadata);
}

for (const prefix of proximityPollMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityPollMetadata);
}

// The client only sends its own intent ({ raised: boolean }); the server computes the authoritative,
// ordered queue (stamping the timestamp and name, using the trusted senderId). See Space.applyRaisedHand.
metadataProcessor.registerMetadataProcessor("raisedHands", (value, senderId, space) => {
    const raised = typeof value === "object" && value !== null && (value as { raised?: unknown }).raised === true;
    return Promise.resolve(space.applyRaisedHand(senderId, raised));
});

// The client only reports whether it currently holds a granted floor ({ holds: boolean }); the server keeps the
// authoritative list of floor holders (only users given the floor, never the hosts). See Space.applyFloorHolder.
metadataProcessor.registerMetadataProcessor("floorHolders", (value, senderId, space) => {
    const holds = typeof value === "object" && value !== null && (value as { holds?: unknown }).holds === true;
    return Promise.resolve(space.applyFloorHolder(senderId, holds));
});
