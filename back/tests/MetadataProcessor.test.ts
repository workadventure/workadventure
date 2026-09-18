import { describe, expect, it } from "vitest";
import { MetadataProcessor } from "../src/Model/MetadataProcessor";

const question = {
    id: "question-1",
    body: "Can we record?",
    senderId: "sender-1",
    createdAt: 10,
};

describe("MetadataProcessor", () => {
    it("should process metadata keys by prefix", async () => {
        const processor = new MetadataProcessor();
        processor.registerMetadataPrefixProcessor("proximityQaQuestion:", (key, value) =>
            Promise.resolve({
                key,
                value,
                processed: true,
            }),
        );

        await expect(
            processor.processMetadata("proximityQaQuestion:question-1", question, "sender-1", {} as never),
        ).resolves.toEqual({
            key: "proximityQaQuestion:question-1",
            value: question,
            processed: true,
        });
    });

    // The catalogue check runs before dispatching, so a processor never sees a payload of the wrong shape.
    it("should reject a payload that does not match the catalogue, without calling the processor", async () => {
        const processor = new MetadataProcessor();
        let processorCalled = false;
        processor.registerMetadataPrefixProcessor("proximityQaQuestion:", () => {
            processorCalled = true;
            return Promise.resolve(undefined);
        });

        await expect(
            processor.processMetadata("proximityQaQuestion:question-1", { id: "question-1" }, "sender-1", {} as never),
        ).rejects.toThrow();
        expect(processorCalled).toBe(false);
    });

    it("should refuse a client write on a server-owned key", async () => {
        const processor = new MetadataProcessor();

        await expect(
            processor.processMetadata("recording", { recording: true }, "sender-1", {} as never),
        ).rejects.toThrow(/set by the server/);
    });

    // The scripting API (WA.spaces) publishes metadata the catalogue knows nothing about.
    it("should let a key outside the catalogue through untouched", async () => {
        const processor = new MetadataProcessor();
        const value = { whatever: [1, 2, 3] };

        await expect(processor.processMetadata("myCustomScriptingKey", value, "sender-1", {} as never)).resolves.toBe(
            value,
        );
    });
});
