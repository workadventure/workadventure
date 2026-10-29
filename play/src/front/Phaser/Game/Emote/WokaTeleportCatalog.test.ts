import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS, isWokaEmoteId } from "@workadventure/shared-utils";
import { sampleWokaEmote } from "./WokaEmoteCatalog";
import { claimTeleport, TELEPORT_IN, TELEPORT_MAX_PER_SECOND, TELEPORT_OUT } from "./WokaTeleportCatalog";
import { buildGlyphSvg } from "./WokaEmoteGlyphs";

describe("the teleports", () => {
    it("cannot be broadcast by a player", () => {
        for (const id of [TELEPORT_IN.id, TELEPORT_OUT.id]) {
            expect(isWokaEmoteId(id)).toBe(false);
            expect(WOKA_EMOTE_IDS).not.toContain(id);
        }
    });

    it("bring the Woka in from nothing, and hand it back as it stands", () => {
        expect(sampleWokaEmote(TELEPORT_IN, 0).alpha).toBe(0);
        // The emote ends on the Woka at rest: it is handed straight back to the idle animation.
        expect(sampleWokaEmote(TELEPORT_IN, TELEPORT_IN.duration)).toMatchObject({
            x: 0,
            y: 0,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
        });
    });

    it("take the Woka away for good", () => {
        // The Woka is destroyed when the scene ends: anything still visible then would vanish in a snap.
        expect(sampleWokaEmote(TELEPORT_OUT, 0)).toMatchObject({ x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 });
        expect(sampleWokaEmote(TELEPORT_OUT, TELEPORT_OUT.duration).alpha).toBeCloseTo(0);
    });

    it.each([TELEPORT_IN, TELEPORT_OUT])("$id leaves no light behind it", (scene) => {
        expect(scene.ground?.sample(scene.duration).scale ?? 0).toBeCloseTo(0);
        for (const prop of scene.props ?? []) {
            expect(prop.sample(scene.duration)?.alpha ?? 0).toBeCloseTo(0);
            expect(buildGlyphSvg(prop.glyph)).toContain("<rect");
        }
    });

    it("are silent: a room filling up would chime without end", () => {
        expect(TELEPORT_IN.sounds).toBeUndefined();
        expect(TELEPORT_OUT.sounds).toBeUndefined();
    });
});

describe("claimTeleport", () => {
    const joinedAt = 10_000;

    it("plays nothing in the first seconds after joining: those Wokas were already there", () => {
        expect(claimTeleport(joinedAt + 2_999, joinedAt, [])).toBe(false);
        expect(claimTeleport(joinedAt + 3_000, joinedAt, [])).toBe(true);
        expect(claimTeleport(joinedAt + 5_000, undefined, [])).toBe(false);
    });

    it("caps how many teleports start within a second", () => {
        const recent: number[] = [];
        const now = joinedAt + 10_000;
        for (let i = 0; i < TELEPORT_MAX_PER_SECOND; i++) {
            expect(claimTeleport(now + i, joinedAt, recent)).toBe(true);
        }
        expect(claimTeleport(now + 500, joinedAt, recent)).toBe(false);
        // A second later, the first ones no longer count.
        expect(claimTeleport(now + 1_000, joinedAt, recent)).toBe(true);
    });
});
