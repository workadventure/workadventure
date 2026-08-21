import type { WokaEmoteId } from "@workadventure/shared-utils";
import { WOKA_EMOTE_IDS } from "@workadventure/shared-utils";
import type { WokaEmoteGlyphName } from "./WokaEmoteGlyphs";

/**
 * Recipes for the animated Woka emotes.
 *
 * A Woka spritesheet holds 12 frames and nothing more (3 walk frames × 4 directions), and worlds may
 * upload their own, so an emote can only ever reorder those frames and move the layer sprites around.
 * Every recipe below therefore sticks to what a Phaser tween can express: an offset, a scale, an
 * angle, and a frame index. Nothing here needs a single new pixel.
 *
 * Emotes that change the Woka's *posture* rather than its position — sitting, clapping, waving —
 * cannot be expressed this way and are deliberately absent: they need drawn frames.
 */

/** Idle frame of each direction, as laid out by getPlayerAnimations(). */
const DOWN = 1;
const LEFT = 4;
const RIGHT = 7;
const UP = 10;
/** First walk frame, the one where the Woka has both feet off its resting pose. */
const STRIDE = 0;

export interface WokaEmoteState {
    /** Frame index inside the 12-frame spritesheet. */
    frame: number;
    /** Horizontal offset, in sprite pixels. */
    x: number;
    /** Vertical offset, in sprite pixels. Negative is up. */
    y: number;
    /** Rotation in degrees, applied around the Woka's feet. */
    angle: number;
    scaleX: number;
    scaleY: number;
}

/**
 * A trickle of little glyphs floating away from the Woka: the notes of a dance, the hearts of a
 * cheer, the zzz of an absence. They are pixel art drawn as SVG (see WokaEmoteGlyphs), on the same
 * grid as the sprites — no spritesheet to commission, and they scale with the camera on their own.
 */
export interface WokaEmoteParticleSpec {
    glyph: WokaEmoteGlyphName;
    /** Emit a batch every N milliseconds, for as long as the emote runs. */
    everyMs?: number;
    /** ...or emit a batch at each of these instants. Use one or the other. */
    at?: number[];
    /** Glyphs per batch. */
    count: number;
    /** How long one glyph lives, in milliseconds. */
    life: number;
    /** Vertical speed in sprite pixels per millisecond. Negative rises. */
    riseSpeed: number;
    /** Horizontal spread of the spawn point, in sprite pixels. */
    spread: number;
    /** Sideways drift in sprite pixels per millisecond. */
    drift?: number;
    /** Downward pull, for anything that is thrown rather than floating. */
    gravity?: number;
    /** Height above the Woka's feet where the glyphs appear. */
    originY?: number;
}

export interface WokaEmoteDefinition {
    id: WokaEmoteId;
    /** How long the animation runs, in milliseconds. */
    duration: number;
    /** Glyph shown in the emote wheel. */
    icon: string;
    /**
     * Optional emoji played in the speech-bubble that already exists for emoji emotes. Several
     * animations only read as intended with it: a slow breath is just a slow breath until a 💤
     * floats above the Woka.
     */
    bubble?: string;
    /** Glyphs floating off the Woka while it performs. Played instead of `bubble` when present. */
    particles?: WokaEmoteParticleSpec[];
    sample: (elapsed: number) => Partial<WokaEmoteState>;
}

/* -------------------------------------------------------------------------- */
/* Easing and timing helpers. Kept pure so they can be unit-tested without Phaser. */
/* -------------------------------------------------------------------------- */

export type EaseName = "linear" | "quadIn" | "quadOut" | "bounceOut";

const EASES: Record<EaseName, (t: number) => number> = {
    linear: (t) => t,
    quadIn: (t) => t * t,
    quadOut: (t) => 1 - (1 - t) * (1 - t),
    bounceOut: (t) => {
        const n = 7.5625;
        const d = 2.75;
        if (t < 1 / d) return n * t * t;
        if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
        if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
        return n * (t -= 2.625 / d) * t + 0.984375;
    },
};

export interface TrackSegment {
    /** Absolute time, in milliseconds, at which this segment ends. */
    at: number;
    to: number;
    ease?: EaseName;
}

/**
 * Interpolates a single property along a series of segments, the way a chained Phaser tween would.
 */
export function track(elapsed: number, from: number, segments: TrackSegment[]): number {
    let previous = from;
    let start = 0;
    for (const segment of segments) {
        if (elapsed >= segment.at) {
            previous = segment.to;
            start = segment.at;
            continue;
        }
        const duration = segment.at - start;
        const progress = duration <= 0 ? 1 : (elapsed - start) / duration;
        const eased = EASES[segment.ease ?? "linear"](Math.max(0, Math.min(1, progress)));
        return previous + (segment.to - previous) * eased;
    }
    return previous;
}

/** A sine oscillation of the given period, in milliseconds. */
export function oscillate(elapsed: number, period: number): number {
    return Math.sin((elapsed / period) * Math.PI * 2);
}

/**
 * A swell between 0 and 1 that starts and ends at 0 over each period. Recipes use it rather than a
 * raw sine so that an emote always begins and ends on the Woka's resting pose: anything else shows
 * up as a snap when the animation hands the frames back to the idle loop.
 */
export function swell(elapsed: number, period: number): number {
    return (1 - Math.cos((elapsed / period) * Math.PI * 2)) / 2;
}

/** Picks an entry of `values`, switching every `period` milliseconds. */
export function stepThrough<T>(elapsed: number, period: number, values: T[]): T {
    return values[Math.floor(elapsed / period) % values.length];
}

/* -------------------------------------------------------------------------- */
/* The catalogue itself                                                        */
/* -------------------------------------------------------------------------- */

const DEFINITIONS: Record<WokaEmoteId, WokaEmoteDefinition> = {
    nod: {
        id: "nod",
        duration: 700,
        icon: "🙂",
        // The mirror of `nope`: same shake, turned through ninety degrees. A catalogue that can say
        // no and not yes is half a vocabulary.
        sample: (t) => ({
            frame: DOWN,
            y: 3.5 * swell(t, 350),
            scaleY: 1 - 0.05 * swell(t, 350),
        }),
    },

    question: {
        id: "question",
        duration: 1400,
        icon: "❓",
        // Here the tilt is the message rather than a stand-in for a missing arm: a head leans when
        // it does not understand.
        particles: [
            {
                glyph: "question",
                at: [120],
                count: 1,
                life: 1100,
                riseSpeed: -0.005,
                spread: 2,
                drift: 0.001,
                originY: 26,
            },
        ],
        sample: (t) => ({
            frame: DOWN,
            angle: 10 * oscillate(t, 1400),
            y: -swell(t, 1400),
        }),
    },

    laugh: {
        id: "laugh",
        duration: 1100,
        icon: "😂",
        // A body that bounces on the spot is not, on its own, readable as laughter: `celebrate` and
        // `jump` bounce too. The three "HA" puffs are what names the emote, and they leave the head
        // in the rhythm of the shake.
        particles: [
            {
                glyph: "laugh",
                at: [60, 300, 540],
                count: 1,
                life: 560,
                riseSpeed: -0.022,
                spread: 6,
                drift: 0.007,
                originY: 26,
            },
        ],
        sample: (t) => {
            const damping = Math.max(0, 1 - t / 1100);
            const beat = oscillate(t, 140);
            return {
                frame: DOWN,
                // Vertical, where `nope` shakes sideways. That is what tells the two apart at 32px.
                y: -Math.abs(beat) * 2.5 * damping,
                angle: beat * 4 * damping,
                scaleY: 1 + 0.03 * Math.abs(beat) * damping,
            };
        },
    },

    moonwalk: {
        id: "moonwalk",
        duration: 1600,
        icon: "🕴",
        // Walk frames run backwards while the Woka slides the other way, then it walks back to where
        // it started. Nothing new is drawn; the existing frames just play in reverse.
        sample: (t) =>
            t < 1100
                ? { frame: stepThrough(t, 110, [8, 7, 6, 7]), x: -16 * (t / 1100) }
                : { frame: stepThrough(t - 1100, 110, [6, 7, 8, 7]), x: -16 * (1 - (t - 1100) / 500) },
    },

    runInPlace: {
        id: "runInPlace",
        duration: 1200,
        icon: "🏃",
        sample: (t) => ({
            frame: stepThrough(t, 60, [STRIDE, DOWN, 2, DOWN]),
            y: -Math.abs(oscillate(t, 120)) * 1.5,
            x: oscillate(t, 120) * Math.max(0, 1 - t / 1200),
        }),
    },

    jump: {
        id: "jump",
        duration: 860,
        icon: "🤸",
        sample: (t) => ({
            frame: t > 140 && t < 640 ? STRIDE : DOWN,
            y: track(t, 0, [
                { at: 140, to: 0 },
                { at: 400, to: -15, ease: "quadOut" },
                { at: 760, to: 0, ease: "bounceOut" },
            ]),
            scaleY: track(t, 1, [
                { at: 140, to: 0.84, ease: "quadOut" },
                { at: 400, to: 1.1, ease: "quadOut" },
                { at: 700, to: 0.9, ease: "quadIn" },
                { at: 860, to: 1, ease: "quadOut" },
            ]),
            scaleX: track(t, 1, [
                { at: 140, to: 1.12, ease: "quadOut" },
                { at: 400, to: 0.93, ease: "quadOut" },
                { at: 700, to: 1.08, ease: "quadIn" },
                { at: 860, to: 1, ease: "quadOut" },
            ]),
        }),
    },

    spin: {
        id: "spin",
        duration: 940,
        icon: "🌀",
        sample: (t) => ({
            // Cycling the four directions is a real pirouette: the sprite already holds every angle.
            frame: t < 760 ? stepThrough(t, 95, [DOWN, LEFT, UP, RIGHT]) : DOWN,
            y: -2 * swell(t, 940),
            scaleX: 1 - 0.06 * swell(t, 470),
        }),
    },

    dance: {
        id: "dance",
        duration: 2160, // three 720ms bars
        icon: "🕺",
        bubble: "🎵",
        particles: [{ glyph: "note", everyMs: 360, count: 1, life: 900, riseSpeed: -0.026, spread: 10, drift: 0.004 }],
        sample: (t) => {
            const facingRight = Math.floor(t / 180) % 2 === 1;
            const swing = Math.abs(oscillate(t, 360));
            return {
                frame: facingRight ? RIGHT : LEFT,
                y: -swing * 3,
                angle: (facingRight ? 7 : -7) * swing,
                scaleY: 1 + 0.04 * swing,
            };
        },
    },

    celebrate: {
        id: "celebrate",
        duration: 1400, // two 700ms hops
        icon: "🎉",
        // The confetti of the mock-up would need a pixel-art sheet that does not exist yet; until it
        // does, the bubble carries the celebration and the body carries the energy.
        bubble: "🎉",
        particles: [
            {
                glyph: "confetti",
                at: [60, 740],
                count: 5,
                life: 600,
                riseSpeed: -0.05,
                spread: 16,
                drift: 0.03,
                gravity: 0.00012,
                originY: 30,
            },
        ],
        sample: (t) => {
            const hop = t % 700;
            return {
                frame: hop > 60 && hop < 480 ? STRIDE : DOWN,
                y: track(hop, 0, [
                    { at: 60, to: 0 },
                    { at: 300, to: -11, ease: "quadOut" },
                    { at: 620, to: 0, ease: "bounceOut" },
                ]),
                scaleY: track(hop, 1, [
                    { at: 60, to: 0.88, ease: "quadOut" },
                    { at: 300, to: 1.08, ease: "quadOut" },
                    { at: 620, to: 1, ease: "quadOut" },
                ]),
            };
        },
    },

    nope: {
        id: "nope",
        duration: 700,
        icon: "🙅",
        sample: (t) => ({
            frame: stepThrough(t, 160, [LEFT, RIGHT]),
            x: oscillate(t, 160) * 3 * Math.max(0, 1 - t / 700),
        }),
    },

    love: {
        id: "love",
        duration: 1600,
        icon: "❤️",
        bubble: "❤️",
        particles: [{ glyph: "heart", everyMs: 300, count: 1, life: 700, riseSpeed: -0.024, spread: 9, drift: 0.003 }],
        sample: (t) => {
            const pulse = oscillate(t, 400);
            return {
                frame: DOWN,
                scaleX: 1 + 0.04 * pulse,
                scaleY: 1 + 0.04 * pulse,
                y: -Math.abs(oscillate(t, 800)) * 1.5,
            };
        },
    },

    afk: {
        id: "afk",
        duration: 2400,
        icon: "💤",
        bubble: "💤",
        particles: [
            {
                glyph: "zzz",
                everyMs: 600,
                count: 1,
                life: 1000,
                riseSpeed: -0.016,
                spread: 4,
                drift: 0.006,
                originY: 26,
            },
        ],
        sample: (t) => ({
            frame: DOWN,
            y: 1.5 * swell(t, 2400),
            scaleY: 1 - 0.03 * swell(t, 2400),
        }),
    },
};

export const WOKA_EMOTES: WokaEmoteDefinition[] = WOKA_EMOTE_IDS.map((id) => DEFINITIONS[id]);

export function getWokaEmote(id: WokaEmoteId): WokaEmoteDefinition {
    return DEFINITIONS[id];
}

/** Fills in the properties a recipe left untouched, so callers always get a complete state. */
export function sampleWokaEmote(definition: WokaEmoteDefinition, elapsed: number): WokaEmoteState {
    const clamped = Math.max(0, Math.min(elapsed, definition.duration));
    const partial = definition.sample(clamped);
    return {
        frame: partial.frame ?? DOWN,
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        angle: partial.angle ?? 0,
        scaleX: partial.scaleX ?? 1,
        scaleY: partial.scaleY ?? 1,
    };
}
