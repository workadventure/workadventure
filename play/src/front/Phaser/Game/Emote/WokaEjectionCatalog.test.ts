import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS, isWokaEmoteId } from "@workadventure/shared-utils";
import { mirrorWokaEmoteState, sampleWokaEmote, WOKA_EMOTE_SOUND_PATH } from "./WokaEmoteCatalog";
import { WOKA_EJECTIONS, isWokaEjection } from "./WokaEjectionCatalog";
import { buildGlyphSvg } from "./WokaEmoteGlyphs";

describe("the ejections", () => {
    it("cannot be broadcast by a player", () => {
        // The back only relays emotes from WOKA_EMOTE_IDS: an ejection in there would let anyone
        // make it look as if someone else had just been banned.
        for (const ejection of WOKA_EJECTIONS) {
            expect(isWokaEmoteId(ejection.id)).toBe(false);
            expect(WOKA_EMOTE_IDS).not.toContain(ejection.id);
        }
    });

    it("only accepts the two values the back sends", () => {
        expect(isWokaEjection("kicked")).toBe(true);
        expect(isWokaEjection("banned")).toBe(true);
        expect(isWokaEjection(undefined)).toBe(false);
        expect(isWokaEjection("")).toBe(false);
        expect(isWokaEjection("spin")).toBe(false);
    });

    it.each(WOKA_EJECTIONS.map((ejection) => [ejection.id, ejection] as const))(
        "%s starts on the Woka as it stood and ends with it gone",
        (_id, ejection) => {
            // The Woka is destroyed when the scene ends: anything still visible then would vanish in a snap.
            expect(sampleWokaEmote(ejection, 0)).toMatchObject({ x: 0, y: 0, angle: 0, alpha: 1 });
            expect(sampleWokaEmote(ejection, ejection.duration).alpha).toBeCloseTo(0);
            for (const prop of ejection.props ?? []) {
                const last = prop.sample(ejection.duration);
                expect(last?.alpha ?? 0).toBeCloseTo(0);
            }
        },
    );

    it("draws every prop from the glyph table", () => {
        for (const prop of WOKA_EJECTIONS.flatMap((ejection) => ejection.props ?? [])) {
            expect(buildGlyphSvg(prop.glyph)).toContain("<rect");
        }
    });

    it("ships a sound for each ejection, short enough to end with its scene", () => {
        const shipped = Object.keys(import.meta.glob("/public/resources/objects/emotes/*"));
        for (const ejection of WOKA_EJECTIONS) {
            expect(ejection.sound).toBeDefined();
            expect(shipped).toContain(`/public${WOKA_EMOTE_SOUND_PATH}${ejection.sound?.file}`);
        }
    });
});

describe("the mirrored ejection", () => {
    it("throws the Woka away from a moderator standing on its right", () => {
        const kicked = WOKA_EJECTIONS.find((ejection) => ejection.id === "kicked");
        if (!kicked) throw new Error("kicked is missing");
        // Before the blow it turns towards the boot: left in the recipe, right in the mirror.
        expect(sampleWokaEmote(kicked, 300).frame).toBe(4);
        expect(mirrorWokaEmoteState(sampleWokaEmote(kicked, 300)).frame).toBe(7);
        // In flight it goes right in the recipe, left in the mirror.
        expect(sampleWokaEmote(kicked, 1200).x).toBeGreaterThan(0);
        expect(mirrorWokaEmoteState(sampleWokaEmote(kicked, 1200)).x).toBeLessThan(0);
    });

    it("leaves the frames facing the player or away from them alone", () => {
        for (const frame of [0, 1, 2, 9, 10, 11]) {
            const state = { frame, x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1 };
            expect(mirrorWokaEmoteState(state).frame).toBe(frame);
        }
    });
});
