import { MetadataProcessor } from "./MetadataProcessor";

// Space metadata is free-form: the scripting API and external modules publish whatever keys they need, so nothing
// is registered here by default. Data the server is the authority on (raised hands, recording, proximity polls and
// Q&A) lives in the space state instead, see Space.updateState.
export const metadataProcessor = new MetadataProcessor();
