import { describe, expect, it } from "vitest";
import { WAMFileFormat } from "@workadventure/map-editor";
import { UpdateWAMSettingFrontCommand } from "../../src/front/Phaser/Game/MapEditor/Commands/WAM/UpdateWAMSettingFrontCommand";

describe("Test UpdateWAMSettingFrontCommand", () => {
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
    it("should not change WAM file loaded when undo is used", async () => {
        const wamFile: WAMFileFormat = { ...defaultWamFile };

        const command = new UpdateWAMSettingFrontCommand(
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
        const undoCommand = command.getUndoCommand();
        await undoCommand.execute();
        expect(wamFile.settings).toBeDefined();
        /*expect(result.type).toBe("UpdateWAMSettingCommand");
        if (result.type === "UpdateWAMSettingCommand") {
            expect(result.name).toBe("megaphone");
            expect(result.dataToModify).toBeUndefined();
        } else {
            assert.fail("result.type is not UpdateWAMSettingCommand");
        }*/
    });
});
