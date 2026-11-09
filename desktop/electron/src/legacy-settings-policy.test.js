import { expect, test } from "vitest";
import { createDesktopConfig } from "./desktop-url-policy";
import { migrateLegacySettings } from "./legacy-settings-policy";

test("carries the 1.x servers, shortcuts and auto-launch over to 2.0", () => {
    const legacy = {
        log_level: "info",
        auto_launch_enabled: true,
        servers: [
            { _id: "1", name: "WA Demo", url: "https://play.staging.workadventu.re/@/tcm/workadventure/wa-village" },
            { _id: "2", name: "Office", url: "https://play.workadventu.re/@/acme/office/hq" },
            { _id: "3", name: "Self-hosted", url: "https://wa.acme.example/_/global/maps.acme.example/office.tmj" },
            { _id: "4", name: "Insecure", url: "http://wa.insecure.example/_/global/maps.example/map.tmj" },
            { _id: "5", url: 42 },
        ],
        shortcuts: { mute_toggle: "CommandOrControl+M", camera_toggle: "" },
    };
    expect(migrateLegacySettings(legacy, createDesktopConfig({}))).toStrictEqual({
        pinned_worlds: [
            "https://play.workadventu.re/@/acme/office/hq",
            "https://wa.acme.example/_/global/maps.acme.example/office.tmj",
        ],
        trusted_origins: ["https://wa.acme.example"],
        shortcuts: { mute_toggle: "CommandOrControl+M", camera_toggle: "" },
        auto_launch_enabled: true,
    });
});

test("a missing or broken 1.x file migrates nothing", () => {
    expect(migrateLegacySettings(undefined, createDesktopConfig({}))).toStrictEqual({});
    expect(migrateLegacySettings("nope", createDesktopConfig({}))).toStrictEqual({});
    expect(migrateLegacySettings({}, createDesktopConfig({}))).toStrictEqual({
        pinned_worlds: [],
        trusted_origins: [],
    });
});
