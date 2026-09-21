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
