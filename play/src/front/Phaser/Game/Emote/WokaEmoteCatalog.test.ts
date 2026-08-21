import { describe, expect, it } from "vitest";
import { WOKA_EMOTE_IDS } from "@workadventure/shared-utils";
import { WOKA_EMOTES, getWokaEmote, sampleWokaEmote, swell, track } from "./WokaEmoteCatalog";
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
