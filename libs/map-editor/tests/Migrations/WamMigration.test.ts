import { WAMFileFormat } from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { describe, it, expect } from "vitest";

describe("wamMigration", () => {
    it("should migrate the wam file from V1 to V2", () => {
        const wamFileContent = {
            version: "1.0.0",
            mapUrl: "https://example.com/map.tmj",
            entities: {},
            areas: [],
            entityCollections: [],
        };

        const wamFile = wamFileMigration.migrate(wamFileContent);

        expect(WAMFileFormat.parse(wamFile)).toEqual({
            version: "2.0.0",
            mapUrl: "https://example.com/map.tmj",
            entities: {},
            areas: [],
            entityCollections: [],
        });
    });

    it("should not modify the wam file if it is already up to date", () => {
        const wamFileContent: WAMFileFormat = {
            version: "2.0.0",
            mapUrl: "https://example.com/map.tmj",
            entities: {},
            areas: [],
            entityCollections: [],
        };
        const wamFile = wamFileMigration.migrate(wamFileContent);
        expect(WAMFileFormat.parse(wamFile)).toEqual(wamFileContent);
    });

    it("should throw an error if the wam file is not valid", () => {
        const invalidWamFileContent = {
            version: "1.0.0",
            mapUrl: "https://example.com/map.tmj",
            entities: {},
            areas: {},
        };

        expect(() => WAMFileFormat.parse(wamFileMigration.migrate(invalidWamFileContent))).toThrow();
    });
});
