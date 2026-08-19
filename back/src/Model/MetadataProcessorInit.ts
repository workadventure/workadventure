import { MetadataProcessor } from "./MetadataProcessor";
import { processProximityPollMetadata, proximityPollMetadataPrefixes } from "./ProximityPollMetadataProcessor";
import { processProximityQAMetadata, proximityQAMetadataPrefixes } from "./ProximityQAMetadataProcessor";
import {
    FLOOR_HOLDERS_METADATA_KEY,
    RAISED_HANDS_METADATA_KEY,
    processFloorHoldersMetadata,
    processRaisedHandsMetadata,
} from "./RaisedHandsMetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});

for (const prefix of proximityQAMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityQAMetadata);
}

for (const prefix of proximityPollMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityPollMetadata);
}

// The client only sends its own intent ({ raised: boolean }); the server computes the authoritative,
// ordered queue (stamping the timestamp and name, using the trusted senderId). See Space.applyRaisedHand.
metadataProcessor.registerMetadataProcessor(RAISED_HANDS_METADATA_KEY, processRaisedHandsMetadata);

// The client only reports whether it currently holds a granted floor ({ holds: boolean }); the server keeps the
// authoritative list of floor holders (only users given the floor, never the hosts). See Space.applyFloorHolder.
metadataProcessor.registerMetadataProcessor(FLOOR_HOLDERS_METADATA_KEY, processFloorHoldersMetadata);
