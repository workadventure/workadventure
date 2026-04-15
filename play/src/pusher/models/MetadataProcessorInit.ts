import { MetadataProcessor } from "./MetadataProcessor";

export const metadataProcessor = new MetadataProcessor();
metadataProcessor.registerMetadataProcessor("recording", () => undefined);
