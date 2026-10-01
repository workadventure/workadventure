import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS, isWokaEmoteId } from "@workadventure/shared-utils";
import { mirrorWokaEmoteState, sampleWokaEmote, WOKA_EMOTE_SOUND_PATH } from "./WokaEmoteCatalog";
import { BANNED, isWokaEjection } from "./WokaEjectionCatalog";
import { buildGlyphSvg } from "./WokaEmoteGlyphs";

describe("the ejections", () => {
    it("cannot be broadcast by a player", () => {
        // The back only relays emotes from WOKA_EMOTE_IDS: an ejection in there would let anyone
        // make it look as if someone else had just been kicked or banned.
        for (const id of ["kicked", "banned", "kick"]) {
            expect(isWokaEmoteId(id)).toBe(false);
            expect(WOKA_EMOTE_IDS).not.toContain(id);
        }
    });

    it("only accepts the two values the back sends", () => {
        expect(isWokaEjection("kicked")).toBe(true);
        expect(isWokaEjection("banned")).toBe(true);
        expect(isWokaEjection(undefined)).toBe(false);
        expect(isWokaEjection("")).toBe(false);
        expect(isWokaEjection("spin")).toBe(false);
    });
});

describe("the ban", () => {
    it("starts on the Woka as it stood and ends with it gone", () => {
        // The Woka is destroyed when the scene ends: anything still visible then would vanish in a snap.
        expect(sampleWokaEmote(BANNED, 0)).toMatchObject({ x: 0, y: 0, angle: 0, alpha: 1 });
        expect(sampleWokaEmote(BANNED, BANNED.duration).alpha).toBeCloseTo(0);
        for (const prop of BANNED.props ?? []) {
            expect(prop.sample(BANNED.duration)?.alpha ?? 0).toBeCloseTo(0);
            expect(buildGlyphSvg(prop.glyph)).toContain("<rect");
        }
    });

    it("ships its sound", () => {
        const shipped = Object.keys(import.meta.glob("/public/resources/objects/emotes/*"));
        for (const sound of BANNED.sounds ?? []) {
            expect(shipped).toContain(`/public${WOKA_EMOTE_SOUND_PATH}${sound.file}`);
        }
    });
});

describe("the mirror", () => {
    it("swaps the frames facing left and right, and leaves the others alone", () => {
        const at = (frame: number) =>
            mirrorWokaEmoteState({ frame, x: 3, y: 0, angle: 10, scaleX: 1, scaleY: 1, alpha: 1 });
        expect(at(4).frame).toBe(7);
        expect(at(7).frame).toBe(4);
        expect(at(4)).toMatchObject({ x: -3, angle: -10 });
        for (const frame of [0, 1, 2, 9, 10, 11]) {
            expect(at(frame).frame).toBe(frame);
        }
    });
});
