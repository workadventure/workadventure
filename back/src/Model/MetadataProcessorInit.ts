import { MetadataProcessor } from "./MetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

metadataProcessor.registerMetadataProcessor("recording", () => {
    return Promise.reject(new Error("should not be set by the user directly"));
});

// The client only sends its own intent ({ raised: boolean }); the server computes the authoritative,
// ordered queue (stamping the timestamp and name, using the trusted senderId). See Space.applyRaisedHand.
metadataProcessor.registerMetadataProcessor("raisedHands", (value, senderId, space) => {
    const raised = typeof value === "object" && value !== null && (value as { raised?: unknown }).raised === true;
    return Promise.resolve(space.applyRaisedHand(senderId, raised));
});
