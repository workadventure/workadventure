import { spaceKindSchema } from "@workadventure/messages";
import { MetadataProcessor } from "./MetadataProcessor";

// Space metadata is free-form: the scripting API and external modules publish whatever keys they need, so only the
// keys below are checked. Data the server is the authority on (raised hands, recording, proximity polls and
// Q&A) lives in the space state instead, see Space.updateState.
export const metadataProcessor = new MetadataProcessor();

// A value outside the enum throws, and a rejected key is dropped rather than published.
// That is the whole check: the kind is the client's own claim about its space, read by
// the analytics and by labels the front shows itself, so a client that lies about it
// only spoils its own rows.
metadataProcessor.registerMetadataProcessor("spaceKind", (value) => {
    return Promise.resolve(spaceKindSchema.parse(value));
});
