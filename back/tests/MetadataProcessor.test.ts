import { describe, expect, it } from "vitest";
import { MetadataProcessor } from "../src/Model/MetadataProcessor";
import { metadataProcessor } from "../src/Model/MetadataProcessorInit";

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
            processor.processMetadata("proximityQaQuestion:question-1", { id: "question-1" }, "sender-1", {} as never),
        ).resolves.toEqual({
            key: "proximityQaQuestion:question-1",
            value: { id: "question-1" },
            processed: true,
        });
    });

    it("only lets a declared space kind through", async () => {
        await expect(
            metadataProcessor.processMetadata("spaceKind", "megaphone", "sender-1", {} as never),
        ).resolves.toBe("megaphone");
        await expect(
            metadataProcessor.processMetadata("spaceKind", "lobby", "sender-1", {} as never),
        ).rejects.toThrow();
    });
});
