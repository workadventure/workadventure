import { describe, expect, it } from "vitest";
import { MetadataProcessor } from "../src/Model/MetadataProcessor";
import { metadataProcessor } from "../src/Model/MetadataProcessorInit";

describe("MetadataProcessor", () => {
    it("should process metadata keys by prefix", async () => {
        const processor = new MetadataProcessor();
        processor.registerMetadataPrefixProcessor("myPrefix:", (key, value) =>
            Promise.resolve({
                key,
                value,
                processed: true,
            }),
        );

        await expect(processor.processMetadata("myPrefix:1", { id: "1" }, "sender-1", {} as never)).resolves.toEqual({
            key: "myPrefix:1",
            value: { id: "1" },
            processed: true,
        });
    });

    it("only lets a declared space kind through", async () => {
        const space = {} as never;

        await expect(metadataProcessor.processMetadata("spaceKind", "megaphone", "s", space)).resolves.toBe(
            "megaphone",
        );
        await expect(metadataProcessor.processMetadata("spaceKind", "bubble", "s", space)).resolves.toBe("bubble");
        await expect(metadataProcessor.processMetadata("spaceKind", "lobby", "s", space)).rejects.toThrow();
    });

    // The scripting API (WA.spaces) and external modules publish arbitrary metadata.
    it("should let an unregistered key through untouched", async () => {
        const processor = new MetadataProcessor();
        const value = { whatever: [1, 2, 3] };

        await expect(processor.processMetadata("myCustomScriptingKey", value, "sender-1", {} as never)).resolves.toBe(
            value,
        );
    });
});
