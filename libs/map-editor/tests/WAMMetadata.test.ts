import { describe, expect, it, assert } from "vitest";
import { UpdateWAMMetadataCommand, WAMFileFormat } from "../src";

describe("WAM Metadata", () => {
    const defaultWamFile: WAMFileFormat = {
        version: "1.0.0",
        mapUrl: "testMapUrl",
        entities: {},
        areas: [],
        entityCollections: [],
    };
    const dataToModify = {
        name: "Test of room",
        thumbnail: "Test of room thumbnail",
        description: "Test of room description",
        copyright: "Test of copyright",
        tags: "admin,member",
    };
    it("should change WAM file loaded when WAMMetadata receive", async () => {
        const wamFile: WAMFileFormat = { ...defaultWamFile };
        const command = new UpdateWAMMetadataCommand(wamFile, dataToModify, "test-uuid");
        await command.execute();
        expect(wamFile.metadata).toBeDefined();
        if (wamFile.metadata) {
            expect(wamFile.metadata.name).toEqual(dataToModify.name);
            expect(wamFile.metadata.description).toEqual(dataToModify.description);
            expect(wamFile.metadata.copyright).toEqual(dataToModify.copyright);
            expect(wamFile.metadata.thumbnail).toEqual(dataToModify.thumbnail);
        } else {
            assert.fail("wamFile.metadata is not defined");
        }

        if (wamFile.vendor) {
            expect((wamFile.vendor as { tags: string[] }).tags).toBeDefined();
            if ((wamFile.vendor as { tags: string[] }).tags) {
                expect((wamFile.vendor as { tags: string[] }).tags).toEqual(dataToModify.tags.split(","));
            } else {
                assert.fail("wamFile.vendor.tags error");
            }
        } else {
            assert.fail("wamFile.vendor is not defined");
        }
    });
});
