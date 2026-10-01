import { describe, expect, it } from "vitest";
import { sampleWokaEmote, WOKA_EMOTE_SOUND_PATH } from "./WokaEmoteCatalog";
import type { KickGap } from "./WokaKickCatalog";
import { buildKick, KICK_FLIGHTS, KICK_REACH, KICK_SOUNDS, MELEE_STRIKES, RANGED_STRIKES } from "./WokaKickCatalog";
import { buildGlyphSvg } from "./WokaEmoteGlyphs";

/** Moderator beside, far above, slightly on the wrong side below, or unknown to this player. */
const GAPS: (KickGap | undefined)[] = [undefined, { x: -40, y: 0 }, { x: -4, y: -60 }, { x: 6, y: 50 }];

/** A roll that picks strike `s` of its pool and flight `f`. */
const rollFor = (s: number, f: number) => s + f * 2 ** 16;

/** Every scene a player can see: each strike of each pool, with each flight, for each gap. */
function* everyKick() {
    for (const melee of [true, false]) {
        for (const gap of GAPS) {
            const pool = melee && gap ? MELEE_STRIKES : RANGED_STRIKES;
            for (let s = 0; s < pool.length; s++) {
                for (let f = 0; f < KICK_FLIGHTS.length; f++) {
                    yield { melee, gap, kick: buildKick(rollFor(s, f), melee, gap) };
                }
            }
        }
    }
}

describe("the kick", () => {
    it("starts on the target as it stood and ends with it, its shadow and every prop gone", () => {
        for (const { kick } of everyKick()) {
            const { target } = kick;
            const label = `${kick.strike} + ${kick.flight}`;
            expect(sampleWokaEmote(target, 0), label).toMatchObject({ x: 0, y: 0, angle: 0, alpha: 1 });
            expect(sampleWokaEmote(target, target.duration).alpha, label).toBeCloseTo(0);
            expect(target.ground?.sample(target.duration).alpha ?? 0, label).toBeCloseTo(0);
            for (const prop of target.props ?? []) {
                expect(prop.sample(target.duration)?.alpha ?? 0, label).toBeCloseTo(0);
            }
            for (let t = 0; t <= target.duration; t += 50) {
                const frame = sampleWokaEmote(target, t).frame;
                expect(Number.isInteger(frame) && frame >= 0 && frame < 12, `${label} at ${t}ms`).toBe(true);
            }
        }
    });

    it("hands the moderator's Woka back where it stood", () => {
        for (const { kick } of everyKick()) {
            if (!kick.kicker) continue;
            const { kicker } = kick;
            expect(sampleWokaEmote(kicker, 0), kick.strike).toMatchObject({ x: 0, y: 0, angle: 0 });
            const end = sampleWokaEmote(kicker, kicker.duration);
            expect(end.x, kick.strike).toBeCloseTo(0);
            expect(end.y, kick.strike).toBeCloseTo(0);
            expect(end.angle, kick.strike).toBeCloseTo(0);
        }
    });

    it("brings the moderator's Woka beside the target at the impact, wherever it stood", () => {
        for (const gap of GAPS) {
            if (!gap) continue;
            for (let s = 0; s < MELEE_STRIKES.length; s++) {
                const kick = buildKick(rollFor(s, 0), true, gap);
                const kicker = kick.kicker;
                expect(kicker, kick.strike).toBeDefined();
                if (!kicker) continue;
                // The impact is when the target starts taking the blow: when its squash begins.
                const impact = impactOf(kick.target);
                const at = sampleWokaEmote(kicker, impact);
                // Beside the target on its floor line (a jump kick lands from a few pixels above it),
                // within the reach of the lunge.
                expect(Math.abs(gap.y + at.y), kick.strike).toBeLessThanOrEqual(5);
                expect(gap.x + at.x, kick.strike).toBeGreaterThanOrEqual(-KICK_REACH - 1);
                expect(gap.x + at.x, kick.strike).toBeLessThanOrEqual(-KICK_REACH + 10);
            }
        }
    });

    it("draws the flight from the roll alone, so every player sees the same one", () => {
        for (let roll = 0; roll < 2 ** 20; roll += 4099) {
            const flights = new Set(
                GAPS.flatMap((gap) => [true, false].map((melee) => buildKick(roll, melee, gap).flight)),
            );
            expect(flights.size).toBe(1);
        }
    });

    it("falls back on a strike from afar when the moderator is not on this player's screen", () => {
        const ranged = RANGED_STRIKES.map((strike) => strike.id);
        for (let roll = 0; roll < 64; roll++) {
            expect(ranged).toContain(buildKick(roll, true, undefined).strike);
            expect(ranged).toContain(buildKick(roll, false, { x: -20, y: 0 }).strike);
        }
    });

    it("can draw every strike and every flight", () => {
        const strikes = new Set<string>();
        const flights = new Set<string>();
        for (let roll = 0; roll < 2 ** 19; roll += 257) {
            for (const melee of [true, false]) {
                const kick = buildKick(roll, melee, { x: -40, y: 0 });
                strikes.add(kick.strike);
                flights.add(kick.flight);
            }
        }
        expect([...strikes].sort()).toEqual([...MELEE_STRIKES, ...RANGED_STRIKES].map((strike) => strike.id).sort());
        expect([...flights].sort()).toEqual(KICK_FLIGHTS.map((flight) => flight.id).sort());
    });

    it("draws its props from the glyph table", () => {
        for (const { kick } of everyKick()) {
            for (const prop of kick.target.props ?? []) {
                expect(buildGlyphSvg(prop.glyph)).toContain("<rect");
            }
        }
    });

    it("ships its sounds, each starting before its scene is over", () => {
        const shipped = Object.keys(import.meta.glob("/public/resources/objects/emotes/*"));
        for (const sound of KICK_SOUNDS) {
            expect(shipped).toContain(`/public${WOKA_EMOTE_SOUND_PATH}${sound.file}`);
        }
        const preloaded = KICK_SOUNDS.map((sound) => sound.file);
        for (const { kick } of everyKick()) {
            for (const sound of kick.target.sounds ?? []) {
                expect(preloaded).toContain(sound.file);
                expect(sound.at ?? 0).toBeLessThan(kick.target.duration);
            }
        }
    });
});

/** The first instant the target is squashed by the blow. */
function impactOf(target: Parameters<typeof sampleWokaEmote>[0]): number {
    for (let t = 0; t <= target.duration; t++) {
        if (sampleWokaEmote(target, t).scaleX > 1) return t - 1;
    }
    throw new Error("No impact found");
}
