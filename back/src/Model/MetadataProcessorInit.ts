import { FilterType } from "@workadventure/messages";
import { isMeetingKind, spaceKindSchema } from "@workadventure/shared-utils";
import { MetadataProcessor } from "./MetadataProcessor";
import { processProximityPollMetadata, proximityPollMetadataPrefixes } from "./ProximityPollMetadataProcessor";
import { processProximityQAMetadata, proximityQAMetadataPrefixes } from "./ProximityQAMetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});

// A value outside the enum, or one that contradicts the filter the space was created
// with, throws — and a rejected key is dropped rather than published. A meeting is a
// space where everyone sees everyone; a broadcast is a space where only the speakers
// are seen. A client cannot call one the other.
metadataProcessor.registerMetadataProcessor("spaceKind", (value, _senderId, space) => {
    const kind = spaceKindSchema.parse(value);
    if (isMeetingKind(kind) !== (space.filterType === FilterType.ALL_USERS)) {
        throw new Error(`A ${kind} cannot live in a space with filter ${FilterType[space.filterType]}`);
    }
    return Promise.resolve(kind);
});

for (const prefix of proximityQAMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityQAMetadata);
}

for (const prefix of proximityPollMetadataPrefixes) {
    metadataProcessor.registerMetadataPrefixProcessor(prefix, processProximityPollMetadata);
}
