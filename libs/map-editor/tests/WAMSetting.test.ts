import { describe, expect, it } from "vitest";
import { UpdateWAMSettingCommand, type WAMFileFormat } from "../src";

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
        audienceVideoFeedbackActivated: false,
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
        expect(wamFile?.settings?.megaphone).toEqual(dataToModify);
    });
});
