import { describe, expect, it } from "vitest";
import { type WAMSettings, WAMSettingsUtils } from "../src";

const baseSettings: WAMSettings = {
    megaphone: {
        enabled: true,
        recording: {
            enabled: true,
        },
    },
};

describe("WAMSettingsUtils", () => {
    describe("canStartRecordingMegaphone", () => {
        it("denies recording when megaphone recording settings are absent or disabled", () => {
            expect(
                WAMSettingsUtils.canStartRecordingMegaphone(
                    {
                        megaphone: {
                            enabled: true,
                        },
                    },
                    ["admin"],
                    true
                )
            ).toBe(false);
            expect(
                WAMSettingsUtils.canStartRecordingMegaphone(
                    {
                        megaphone: {
                            enabled: true,
                            recording: {
                                enabled: false,
                            },
                        },
                    },
                    ["admin"],
                    true
                )
            ).toBe(false);
        });

        it("allows recording when megaphone recording is enabled without extra rights", () => {
            expect(WAMSettingsUtils.canStartRecordingMegaphone(baseSettings, ["member"], true)).toBe(true);
        });

        it("requires a megaphone recording right when configured", () => {
            const settings: WAMSettings = {
                megaphone: {
                    enabled: true,
                    recording: {
                        enabled: true,
                        rights: ["recorder"],
                    },
                },
            };

            expect(WAMSettingsUtils.canStartRecordingMegaphone(settings, ["member"], true)).toBe(false);
            expect(WAMSettingsUtils.canStartRecordingMegaphone(settings, ["recorder"], true)).toBe(true);
            expect(WAMSettingsUtils.canStartRecordingMegaphone(settings, ["admin"], true)).toBe(true);
        });

        it("also requires global recording and megaphone usage rights", () => {
            expect(
                WAMSettingsUtils.canStartRecordingMegaphone(
                    {
                        recording: {
                            rights: ["global-recorder"],
                        },
                        megaphone: {
                            enabled: true,
                            rights: ["speaker"],
                            recording: {
                                enabled: true,
                            },
                        },
                    },
                    ["global-recorder"],
                    true
                )
            ).toBe(false);
            expect(
                WAMSettingsUtils.canStartRecordingMegaphone(
                    {
                        recording: {
                            rights: ["global-recorder"],
                        },
                        megaphone: {
                            enabled: true,
                            rights: ["speaker"],
                            recording: {
                                enabled: true,
                            },
                        },
                    },
                    ["global-recorder", "speaker"],
                    true
                )
            ).toBe(true);
        });
    });
});
