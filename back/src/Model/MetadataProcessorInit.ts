import { MetadataProcessor } from "./MetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});
