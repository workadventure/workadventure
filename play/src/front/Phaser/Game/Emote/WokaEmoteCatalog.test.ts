import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS } from "@workadventure/shared-utils";
import {
    WOKA_EMOTES,
    WOKA_EMOTE_SOUND_PATH,
    WOKA_EMOTE_SOUND_RANGE,
    WOKA_EMOTE_SOUND_VOLUME,
    getWokaEmote,
    sampleWokaEmote,
    swell,
    track,
    wokaEmoteSoundVolume,
} from "./WokaEmoteCatalog";
import { buildGlyphSvg, isWokaEmoteGlyphName } from "./WokaEmoteGlyphs";

/** The spritesheet holds exactly 12 frames; asking Phaser for anything else renders nothing. */
const FRAME_COUNT = 12;

describe("track", () => {
    it("interpolates between segments", () => {
        const segments = [{ at: 100, to: 10 }];
        expect(track(0, 0, segments)).toBe(0);
        expect(track(50, 0, segments)).toBe(5);
        expect(track(100, 0, segments)).toBe(10);
    });

    it("holds the last value once every segment is over", () => {
        expect(track(999, 0, [{ at: 100, to: 10 }])).toBe(10);
    });

    it("chains segments from wherever the previous one ended", () => {
        const segments = [
            { at: 100, to: 10 },
            { at: 200, to: 0 },
        ];
        expect(track(150, 0, segments)).toBe(5);
    });
});

describe("swell", () => {
    it("is back to zero at both ends of a period", () => {
        expect(swell(0, 400)).toBeCloseTo(0);
        expect(swell(400, 400)).toBeCloseTo(0);
        expect(swell(200, 400)).toBeCloseTo(1);
    });
});

describe("the catalogue", () => {
    it("covers exactly the identifiers the back accepts", () => {
        expect(WOKA_EMOTES.map((emote) => emote.id)).toEqual([...WOKA_EMOTE_IDS]);
    });

    it.each([...WOKA_EMOTE_IDS])("%s stays inside the spritesheet", (id) => {
        const definition = getWokaEmote(id);
        for (let elapsed = 0; elapsed <= definition.duration; elapsed += 10) {
            const { frame } = sampleWokaEmote(definition, elapsed);
            expect(Number.isInteger(frame)).toBe(true);
            expect(frame).toBeGreaterThanOrEqual(0);
            expect(frame).toBeLessThan(FRAME_COUNT);
        }
    });

    // An emote that ends mid-tilt or mid-squash snaps when the idle animation takes the frames back.
    it.each([...WOKA_EMOTE_IDS])("%s starts and ends on the resting pose", (id) => {
        const definition = getWokaEmote(id);
        for (const elapsed of [0, definition.duration]) {
            const state = sampleWokaEmote(definition, elapsed);
            expect(state.x).toBeCloseTo(0, 5);
            expect(state.y).toBeCloseTo(0, 5);
            expect(state.angle).toBeCloseTo(0, 5);
            expect(state.scaleX).toBeCloseTo(1, 5);
            expect(state.scaleY).toBeCloseTo(1, 5);
        }
    });

    it.each([...WOKA_EMOTE_IDS])("%s clamps time outside its duration", (id) => {
        const definition = getWokaEmote(id);
        expect(sampleWokaEmote(definition, -500)).toEqual(sampleWokaEmote(definition, 0));
        expect(sampleWokaEmote(definition, definition.duration + 5000)).toEqual(
            sampleWokaEmote(definition, definition.duration),
        );
    });

    it("never scales a Woka out of proportion", () => {
        for (const definition of WOKA_EMOTES) {
            for (let elapsed = 0; elapsed <= definition.duration; elapsed += 10) {
                const state = sampleWokaEmote(definition, elapsed);
                expect(state.scaleX).toBeGreaterThan(0.5);
                expect(state.scaleX).toBeLessThan(1.5);
                expect(state.scaleY).toBeGreaterThan(0.5);
                expect(state.scaleY).toBeLessThan(1.5);
            }
        }
    });
});

describe("the emoji fallback", () => {
    // The wheel icon is what a back that does not know the identifier relays in the emote's place,
    // and that back only accepts emoji. An icon that is not one would make the emote vanish for
    // every player but its own — which is exactly the failure this fallback exists to prevent.
    const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;

    it("gives every emote an icon the back would accept as an emoji", () => {
        for (const definition of WOKA_EMOTES) {
            const fallback = definition.bubble ?? definition.icon;
            expect(fallback.length).toBeGreaterThan(0);
            expect(fallback.length).toBeLessThanOrEqual(32); // MAX_EMOTE_LENGTH
            expect(EMOJI_ONLY.test(fallback)).toBe(true);
        }
    });
});

describe("the particle emitters", () => {
    it("uses either a period or a list of instants, never both", () => {
        for (const definition of WOKA_EMOTES) {
            for (const spec of definition.particles ?? []) {
                expect(Boolean(spec.everyMs) !== Boolean(spec.at)).toBe(true);
            }
        }
    });

    // A glyph still floating when the body is done leaves the Woka frozen on its last frame.
    it("never emits a glyph that would outlive the emote", () => {
        for (const definition of WOKA_EMOTES) {
            for (const spec of definition.particles ?? []) {
                const lastEmission = spec.at
                    ? Math.max(...spec.at)
                    : definition.duration - spec.life - (spec.everyMs ?? 0);
                expect(lastEmission + spec.life).toBeLessThanOrEqual(definition.duration);
            }
        }
    });

    it("emits something visible", () => {
        for (const definition of WOKA_EMOTES) {
            for (const spec of definition.particles ?? []) {
                expect(isWokaEmoteGlyphName(spec.glyph)).toBe(true);
                expect(spec.count).toBeGreaterThan(0);
                expect(spec.life).toBeGreaterThan(0);
                expect(spec.riseSpeed).toBeLessThan(0); // les glyphes montent
            }
        }
    });
});

describe("the floor marks", () => {
    it("draws arcs that leave a gap, or the rotation would be invisible", () => {
        for (const definition of WOKA_EMOTES) {
            const ground = definition.ground;
            if (!ground) continue;
            expect(ground.radius).toBeGreaterThan(0);
            const covered = ground.arcs.reduce((total, [from, to]) => {
                expect(to).toBeGreaterThan(from);
                return total + (to - from);
            }, 0);
            expect(covered).toBeLessThan(360);
        }
    });

    it("fades out by the end, so the Woka is handed back unmarked", () => {
        for (const definition of WOKA_EMOTES) {
            const ground = definition.ground;
            if (!ground) continue;
            expect(ground.sample(definition.duration).alpha ?? 1).toBeCloseTo(0);
        }
    });

    it("never turns the ring inside out", () => {
        for (const definition of WOKA_EMOTES) {
            const ground = definition.ground;
            if (!ground) continue;
            for (let t = 0; t <= definition.duration; t += definition.duration / 20) {
                const state = ground.sample(t);
                expect(state.scale ?? 1).toBeGreaterThan(0);
                expect(state.alpha ?? 1).toBeGreaterThanOrEqual(0);
                expect(state.alpha ?? 1).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe("the pixel glyphs", () => {
    it("draws every glyph the catalogue asks for", () => {
        for (const definition of WOKA_EMOTES) {
            for (const spec of definition.particles ?? []) {
                const svg = buildGlyphSvg(spec.glyph);
                expect(svg.startsWith("<svg")).toBe(true);
                expect(svg.includes("<rect")).toBe(true);
            }
        }
    });

    it("gives confetti a different colour on each spawn", () => {
        const first = buildGlyphSvg("confetti", 0);
        const second = buildGlyphSvg("confetti", 1);
        expect(first === second).toBe(false);
    });

    it("keeps a fixed colour for the glyphs that have one", () => {
        expect(buildGlyphSvg("heart", 0)).toBe(buildGlyphSvg("heart", 7));
    });

    it("rejects a name that is not in the table", () => {
        expect(isWokaEmoteGlyphName("sparkles")).toBe(false);
    });
});

describe("the sounds", () => {
    const NEAR = 64; // MINIMUM_DISTANCE in the default configuration

    it("is heard in full within a conversation-bubble radius", () => {
        expect(wokaEmoteSoundVolume(0, NEAR)).toBe(WOKA_EMOTE_SOUND_VOLUME);
        expect(wokaEmoteSoundVolume(NEAR, NEAR)).toBe(WOKA_EMOTE_SOUND_VOLUME);
    });

    it("fades linearly to silence at the edge of its range", () => {
        const halfway = (NEAR + WOKA_EMOTE_SOUND_RANGE) / 2;
        expect(wokaEmoteSoundVolume(halfway, NEAR)).toBeCloseTo(WOKA_EMOTE_SOUND_VOLUME / 2);
        expect(wokaEmoteSoundVolume(WOKA_EMOTE_SOUND_RANGE, NEAR)).toBe(0);
        expect(wokaEmoteSoundVolume(WOKA_EMOTE_SOUND_RANGE * 10, NEAR)).toBe(0);
    });

    it("plays a file that is actually shipped", () => {
        // The Phaser loader only warns on a 404, so a typo here would be a silent emote in production.
        const shipped = Object.keys(import.meta.glob("/public/resources/objects/emotes/*"));
        for (const definition of WOKA_EMOTES) {
            if (!definition.sound) continue;
            expect(shipped, definition.id).toContain("/public" + WOKA_EMOTE_SOUND_PATH + definition.sound.file);
        }
    });

    it("starts before the emote is over", () => {
        for (const definition of WOKA_EMOTES) {
            if (!definition.sound) continue;
            expect(definition.sound.at ?? 0).toBeLessThan(definition.duration);
        }
    });
});
