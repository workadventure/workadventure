import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS, isWokaEmoteId } from "@workadventure/shared-utils";
import { mirrorWokaEmoteState, sampleWokaEmote, WOKA_EMOTE_SOUND_PATH } from "./WokaEmoteCatalog";
import { BAN_SCENES, buildBan, isWokaEjection } from "./WokaEjectionCatalog";
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
    it.each(BAN_SCENES.map((scene, index) => [index, scene] as const))(
        "scene %i starts on the Woka as it stood and ends with it gone",
        (_index, scene) => {
            // The Woka is destroyed when the scene ends: anything still visible then would vanish in a snap.
            expect(sampleWokaEmote(scene, 0)).toMatchObject({ x: 0, y: 0, angle: 0, alpha: 1 });
            expect(sampleWokaEmote(scene, scene.duration).alpha).toBeCloseTo(0);
            expect(scene.ground?.sample(scene.duration).scale ?? 0).toBeCloseTo(0);
            for (const prop of scene.props ?? []) {
                expect(prop.sample(scene.duration)?.alpha ?? 0).toBeCloseTo(0);
                expect(buildGlyphSvg(prop.glyph)).toContain("<rect");
            }
            for (let t = 0; t <= scene.duration; t += 50) {
                const frame = sampleWokaEmote(scene, t).frame;
                expect(Number.isInteger(frame) && frame >= 0 && frame < 12, `at ${t}ms`).toBe(true);
            }
        },
    );

    it("draws every scene from the roll", () => {
        const drawn = new Set(Array.from({ length: 64 }, (_, roll) => buildBan(roll)));
        expect(drawn.size).toBe(BAN_SCENES.length);
        expect(buildBan(12345)).toBe(buildBan(12345));
    });

    it("ships its sounds, each starting before its scene is over", () => {
        const shipped = Object.keys(import.meta.glob("/public/resources/objects/emotes/*"));
        for (const scene of BAN_SCENES) {
            for (const sound of scene.sounds ?? []) {
                expect(shipped).toContain(`/public${WOKA_EMOTE_SOUND_PATH}${sound.file}`);
                expect(sound.at ?? 0).toBeLessThan(scene.duration);
            }
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
