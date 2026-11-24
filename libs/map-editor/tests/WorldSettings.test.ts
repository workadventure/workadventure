import { describe, expect, it } from "vitest";
import { migrateWorldSettingsFromWams, resolveMegaphone, type WAMSettings } from "../src";

const world = (title: string, extra: Partial<NonNullable<WAMSettings["megaphone"]>> = {}): WAMSettings => ({
    megaphone: { enabled: true, scope: "WORLD", title, ...extra },
});

describe("migrateWorldSettingsFromWams", () => {
    it("has no world megaphone when no map has a World one", () => {
        expect(
            migrateWorldSettingsFromWams({ "a.wam": undefined, "b.wam": { megaphone: { enabled: false } } }),
        ).toEqual({});
    });

    it("keeps the settings the World maps agree on", () => {
        const settings = migrateWorldSettingsFromWams({
            "a.wam": world("M", { audienceVideoFeedbackActivated: true }),
            "b.wam": world("M", { audienceVideoFeedbackActivated: true }),
            "c.wam": {
                megaphone: { enabled: true, scope: "ROOM", title: "Local", audienceVideoFeedbackActivated: false },
            },
        });
        expect(settings.megaphone?.audienceVideoFeedbackActivated).toBe(true);
        expect(settings.migrationWarnings).toBeUndefined();
    });

    it("reports World megaphones that had different titles, now one", () => {
        const settings = migrateWorldSettingsFromWams({ "a.wam": world("Main"), "b.wam": world("Other") });
        expect(settings.migrationWarnings).toEqual([expect.stringContaining('"Main", "Other"')]);
    });

    it("takes the most common value when the maps disagree, and says so", () => {
        const settings = migrateWorldSettingsFromWams({
            "a.wam": world("M", { audienceVideoFeedbackActivated: true }),
            "b.wam": world("M", { audienceVideoFeedbackActivated: true }),
            "c.wam": world("M", { audienceVideoFeedbackActivated: false }),
        });
        expect(settings.megaphone?.audienceVideoFeedbackActivated).toBe(true);
        expect(settings.migrationWarnings).toEqual([expect.stringContaining("audienceVideoFeedbackActivated")]);
    });
});

describe("resolveMegaphone", () => {
    const worldSettings = { megaphone: { audienceVideoFeedbackActivated: true } };

    it("uses the map's own settings for a megaphone limited to the map", () => {
        const resolved = resolveMegaphone(
            { megaphone: { enabled: true, scope: "ROOM", title: "T", audienceVideoFeedbackActivated: false } },
            worldSettings,
            "https://play.test/@/org/world",
            "https://play.test/@/org/world/a",
        );
        expect(resolved?.spaceName).toBe("play.test-@-org-world-a-megaphone-T");
        expect(resolved?.settings.megaphone?.audienceVideoFeedbackActivated).toBe(false);
    });

    it("joins the world megaphone, named without a title, with the world's settings and the map's rights", () => {
        const resolved = resolveMegaphone(
            world("Ignored", { audienceVideoFeedbackActivated: false, rights: ["speaker"] }),
            worldSettings,
            "https://play.test/@/org/world",
            "https://play.test/@/org/world/a",
        );
        expect(resolved?.spaceName).toBe("play.test-@-org-world-megaphone");
        expect(resolved?.settings.megaphone?.audienceVideoFeedbackActivated).toBe(true);
        expect(resolved?.settings.megaphone?.rights).toEqual(["speaker"]);
    });

    it("joins the world megaphone with defaults before the world settings are loaded", () => {
        const resolved = resolveMegaphone(world("M"), undefined, "group", "url");
        expect(resolved?.spaceName).toBe("group-megaphone");
        expect(resolved?.settings.megaphone?.audienceVideoFeedbackActivated).toBeUndefined();
    });

    it("has no megaphone when the map's is off", () => {
        expect(resolveMegaphone({ megaphone: { enabled: false } }, worldSettings, "group", "url")).toBeUndefined();
        expect(resolveMegaphone(undefined, worldSettings, "group", "url")).toBeUndefined();
    });
});
