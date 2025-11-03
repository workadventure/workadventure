import { WAMFileFormat } from "@workadventure/map-editor";
import { WamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { describe, it, expect } from "vitest";
import { WamVersion200 } from "../../src/Migrations/WamMigrations/WamVersion2_0_0";

describe("wamMigration", () => {
    const wamTestVersion = new WamVersion200();
    const wamFileMigration = new WamFileMigration(wamTestVersion);

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
