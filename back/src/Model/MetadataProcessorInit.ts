import { spaceKindSchema } from "@workadventure/shared-utils";
import { MetadataProcessor } from "./MetadataProcessor";
import { processProximityPollMetadata, proximityPollMetadataPrefixes } from "./ProximityPollMetadataProcessor";
import { processProximityQAMetadata, proximityQAMetadataPrefixes } from "./ProximityQAMetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});

// A value outside the enum throws, and a rejected key is dropped rather than published.
metadataProcessor.registerMetadataProcessor("spaceKind", (value) => Promise.resolve(spaceKindSchema.parse(value)));

for (const prefix of proximityQAMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityQAMetadata);
}

for (const prefix of proximityPollMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityPollMetadata);
}
