import { describe, expect, it, assert } from "vitest";
import { UpdateWAMSettingCommand, WAMFileFormat } from "../src";

describe("WAM Setting", () => {
    const defaultWamFile: WAMFileFormat = {
        version: "1.0.0",
        mapUrl: "testMapUrl",
        entities: {},
        areas: [],
        entityCollections: [],
    };
    const dataToModify = {
        enabled: true,
        title: "testTitle",
        rights: ["testRights"],
        scope: "testScope",
    };
    it("should change WAM file loaded when WAMSettingCommand received", async () => {
        const wamFile: WAMFileFormat = { ...defaultWamFile };
        const command = new UpdateWAMSettingCommand(
            wamFile,
            {
                message: {
                    $case: "updateMegaphoneSettingMessage",
                    updateMegaphoneSettingMessage: dataToModify,
                },
            },
            "test-uuid"
        );
        await command.execute();
        expect(wamFile.settings).toBeDefined();
        if (wamFile.settings) {
            expect(wamFile.settings.megaphone).toBeDefined();
            if (wamFile.settings.megaphone) {
                expect(wamFile.settings.megaphone).toEqual(dataToModify);
            } else {
                assert.fail("wamFile.settings.megaphone is not defined");
            }
        } else {
            assert.fail("wamFile.settings is not defined");
        }
        /*expect(result.type).toBe("UpdateWAMSettingCommand");
        if (result.type === "UpdateWAMSettingCommand") {
            expect(result.name).toBe("megaphone");
            expect(result.dataToModify).toEqual(dataToModify);
        } else {
            assert.fail("result.type is not UpdateWAMSettingCommand");
        }*/
    });
});
