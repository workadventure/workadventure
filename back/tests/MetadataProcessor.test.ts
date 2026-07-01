import { describe, expect, it } from "vitest";
import { MetadataProcessor } from "../src/Model/MetadataProcessor";

describe("MetadataProcessor", () => {
    it("should process metadata keys by prefix", async () => {
        const processor = new MetadataProcessor();
        processor.registerMetadataPrefixProcessor("proximityQaQuestion:", (key, value) =>
            Promise.resolve({
                key,
                value,
                processed: true,
            })
        );

        await expect(
            processor.processMetadata("proximityQaQuestion:question-1", { id: "question-1" }, "sender-1", {} as never)
        ).resolves.toEqual({
            key: "proximityQaQuestion:question-1",
            value: { id: "question-1" },
            processed: true,
        });
    });
});
