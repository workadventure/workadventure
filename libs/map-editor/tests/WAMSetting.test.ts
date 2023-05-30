import { describe, expect, it, assert } from "vitest";
import { UpdateWAMSettingCommand, UpdateWAMSettingCommandConfig, WAMFileFormat } from "../src";

describe("WAM Setting", () => {
    const defaultWamFile: WAMFileFormat = {
        version: "1.0.0",
        mapUrl: "testMapUrl",
        entities: [],
        areas: [],
        entityCollections: [],
    };
    const commandConfig: UpdateWAMSettingCommandConfig = {
        type: "UpdateWAMSettingCommand",
        name: "megaphone",
        dataToModify: {
            enabled: true,
            title: "testTitle",
            rights: ["testRights"],
            scope: "testScope",
        },
    };
    it("should change WAM file loaded when WAMSettingCommand received", () => {
        const wamFile: WAMFileFormat = { ...defaultWamFile };
        const command = new UpdateWAMSettingCommand(wamFile, commandConfig, "test-uuid");
        const result = command.execute();
        expect(wamFile.settings).toBeDefined();
        if (wamFile.settings) {
            expect(wamFile.settings.megaphone).toBeDefined();
            if (wamFile.settings.megaphone) {
                expect(wamFile.settings.megaphone).toEqual(commandConfig.dataToModify);
            } else {
                assert.fail("wamFile.settings.megaphone is not defined");
            }
        } else {
            assert.fail("wamFile.settings is not defined");
        }
        expect(result.type).toBe("UpdateWAMSettingCommand");
        if (result.type === "UpdateWAMSettingCommand") {
            expect(result.name).toBe("megaphone");
            expect(result.dataToModify).toEqual(commandConfig.dataToModify);
        } else {
            assert.fail("result.type is not UpdateWAMSettingCommand");
        }
    });
    it("should not change WAM file loaded when undo is used", () => {
        const wamFile: WAMFileFormat = { ...defaultWamFile };

        const command = new UpdateWAMSettingCommand(wamFile, commandConfig, "test-uuid");
        command.execute();
        const result = command.undo();
        expect(wamFile.settings).toBeDefined();
        expect(result.type).toBe("UpdateWAMSettingCommand");
        if (result.type === "UpdateWAMSettingCommand") {
            expect(result.name).toBe("megaphone");
            expect(result.dataToModify).toBeUndefined();
        } else {
            assert.fail("result.type is not UpdateWAMSettingCommand");
        }
    });
});
