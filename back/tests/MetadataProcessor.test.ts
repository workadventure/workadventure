import { describe, expect, it } from "vitest";
import { FilterType } from "@workadventure/messages";
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

    it("only lets a declared space kind through, and only one that matches the filter", async () => {
        const broadcast = { filterType: FilterType.LIVE_STREAMING_USERS } as never;
        const meeting = { filterType: FilterType.ALL_USERS } as never;

        await expect(metadataProcessor.processMetadata("spaceKind", "megaphone", "s", broadcast)).resolves.toBe(
            "megaphone",
        );
        await expect(metadataProcessor.processMetadata("spaceKind", "bubble", "s", meeting)).resolves.toBe("bubble");
        await expect(metadataProcessor.processMetadata("spaceKind", "lobby", "s", meeting)).rejects.toThrow();
        // A script naming its space a bubble cannot make it one.
        await expect(metadataProcessor.processMetadata("spaceKind", "bubble", "s", broadcast)).rejects.toThrow();
    });
});
