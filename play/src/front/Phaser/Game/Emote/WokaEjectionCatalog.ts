import type { WokaEmoteDefinition, WokaEmotePropSpec, WokaEmotePropState } from "./WokaEmoteCatalog";
import { oscillate, stepThrough, track } from "./WokaEmoteCatalog";

/**
 * What the other players see when a moderator removes someone, instead of the Woka vanishing like a
 * closed tab: kicked off the map (see WokaKickCatalog), or banned — locked up in a cell, dropped
 * through a trapdoor, sucked into a whirlpool or beamed up. Both are drawn at random from the roll
 * the back sends with the ejection, so that every player sees the same scene.
 *
 * These are emotes as far as the animation engine is concerned, but they are not in WOKA_EMOTE_IDS:
 * that list is what the back lets a player broadcast, and nobody should be able to make it look as
 * if someone else had just been banned. They are only ever played from UserLeftMessage.ejection,
 * which the back sets itself.
 */
export type WokaEjection = "kicked" | "banned";

export function isWokaEjection(value: string | undefined): value is WokaEjection {
    return value === "kicked" || value === "banned";
}

const DOWN = 1;
const LEFT = 4;
const RIGHT = 7;
const UP = 10;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const quadIn = (t: number) => t * t;
const cubicIn = (t: number) => t * t * t;

/** When the cell hits the floor. */
const BAN_LANDING = 420;
const BAN_SINK_START = 1650;
const BAN_SINK_DURATION = 800;

/** The last part of the ban: the cell and the Woka are squashed into the floor together. */
function sink(elapsed: number): { y: number; scaleY: number; alpha: number } {
    const eased = quadIn(clamp01((elapsed - BAN_SINK_START) / BAN_SINK_DURATION));
    return { y: 6 * eased, scaleY: 1 - eased, alpha: 1 - clamp01((eased - 0.6) / 0.4) };
}

/** The Woka rattles its bars between the landing of the cell and the sinking. */
function rattle(elapsed: number): number {
    return elapsed > 600 && elapsed < 1500 ? oscillate(elapsed, 140) : 0;
}

function dust(side: -1 | 1): (elapsed: number) => WokaEmotePropState | null {
    return (t) => {
        const since = t - BAN_LANDING;
        if (since < 0 || since >= 420) return null;
        const progress = since / 420;
        return { x: side * (13 + progress * 10), y: -1 - progress * 3, alpha: 1 - progress };
    };
}

const cell: WokaEmoteDefinition<"banned"> = {
    id: "banned",
    duration: 2600,
    icon: "⛓️",
    // The clang of the landing, the rattle of the bars and the fall, timed inside one file.
    sounds: [{ file: "banned.mp3", at: BAN_LANDING }],
    props: [
        {
            glyph: "cell",
            sample: (t) => {
                const sinking = sink(t);
                return {
                    x: rattle(t) * 0.6,
                    y:
                        track(t, -80, [
                            { at: BAN_LANDING, to: 0, ease: "quadIn" },
                            { at: 500, to: -3, ease: "quadOut" },
                            { at: 580, to: 0, ease: "quadIn" },
                        ]) + sinking.y,
                    scaleY: sinking.scaleY,
                    alpha: sinking.alpha,
                };
            },
        },
        { glyph: "dust", sample: dust(-1) },
        { glyph: "dust", sample: dust(1) },
        {
            glyph: "grawlix",
            sample: (t) => {
                for (const start of [700, 1100]) {
                    const since = t - start;
                    if (since >= 0 && since < 380) {
                        return { x: 9, y: -30 - (since / 380) * 5, alpha: 1 - Math.pow(since / 380, 2) };
                    }
                }
                return null;
            },
        },
    ],
    sample: (t) => {
        const sinking = sink(t);
        return {
            // It looks up at what is falling on it, then faces the players through the bars.
            frame: t >= 200 && t < BAN_LANDING ? UP : DOWN,
            x: rattle(t),
            y: sinking.y,
            // A flinch just before the cell lands.
            scaleY: (t > 250 && t < BAN_LANDING ? 0.92 : 1) * sinking.scaleY,
            alpha: sinking.alpha,
        };
    },
};

/** A trapdoor opens under its feet; it pedals in the air for a beat, then falls in. */
const TRAP_OPEN = 150;
const TRAP_DROP = 620;
const TRAP_GONE = 1120;
const TRAP_SHUT = 1300;

function trapDust(side: -1 | 1): (t: number) => WokaEmotePropState | null {
    return (t) => {
        const since = t - TRAP_SHUT;
        if (since < 0 || since >= 400) return null;
        return { x: side * (10 + since / 40), y: -1, alpha: 1 - since / 400 };
    };
}

const trapdoor: WokaEmoteDefinition<"banned"> = {
    id: "banned",
    duration: 1900,
    icon: "⛓️",
    // The clack of the trapdoor, the slide whistle of the fall and the clack that shuts it, timed inside one file.
    sounds: [{ file: "ban-trapdoor.mp3" }],
    // The hole is drawn on the floor, under the Woka: there is no mask, so the fall reads through its size.
    ground: {
        color: 0x0d0b12,
        fill: true,
        radius: 13.5,
        flatten: 0.44,
        arcs: [],
        sample: (t) => ({
            scale: track(t, 0, [
                { at: TRAP_OPEN, to: 0 },
                { at: TRAP_OPEN + 200, to: 1, ease: "backOut" },
                { at: TRAP_SHUT - 60, to: 1 },
                { at: TRAP_SHUT, to: 0, ease: "quadIn" },
            ]),
        }),
    },
    props: [
        {
            glyph: "surprise",
            sample: (t) => (t > 300 && t < 600 ? { x: 9, y: -30 - (t - 300) / 60 } : null),
        },
        { glyph: "dust", sample: trapDust(-1) },
        { glyph: "dust", sample: trapDust(1) },
    ],
    sample: (t) => {
        const fall = quadIn(clamp01((t - TRAP_DROP) / (TRAP_GONE - TRAP_DROP)));
        const hovering = t > 300 && t < TRAP_DROP;
        return {
            // It looks down at the hole, then pedals in the void like a cartoon character.
            frame: hovering ? stepThrough(t, 70, [0, 2]) : DOWN,
            y: (hovering ? -3 * Math.min(1, (t - 300) / 80) : 0) + 4 * fall,
            scaleX: 1 - 0.82 * fall,
            scaleY: 1 - 0.82 * fall,
            angle: 25 * fall,
            alpha: fall < 0.85 ? 1 : 1 - (fall - 0.85) / 0.15,
        };
    },
};

/** A whirlpool opens on the floor; the Woka spins faster and faster, shrinks and is sucked in. */
const WHIRL_GONE = 2000;

const whirlpool: WokaEmoteDefinition<"banned"> = {
    id: "banned",
    duration: 2300,
    icon: "⛓️",
    // A rising whoosh and the "bloop" of the end, timed inside one file.
    sounds: [{ file: "ban-whirlpool.mp3" }],
    ground: {
        color: 0x9b7bff,
        radius: 14,
        thickness: 1.5,
        flatten: 0.42,
        // Three arms with gaps between them: a closed ring could not be seen turning.
        arcs: [
            [0, 80],
            [120, 200],
            [240, 320],
        ],
        sample: (t) => {
            const u = clamp01(t / WHIRL_GONE);
            return {
                scale: track(t, 0, [
                    { at: 200, to: 1.25, ease: "backOut" },
                    { at: WHIRL_GONE, to: 1 },
                    { at: WHIRL_GONE + 250, to: 0, ease: "quadIn" },
                ]),
                angle: -(t * (0.25 + 0.9 * u)),
                alpha: 0.9,
            };
        },
    },
    sample: (t) => {
        const u = clamp01(t / WHIRL_GONE);
        const shrink = cubicIn(clamp01((t - 700) / (WHIRL_GONE - 700)));
        return {
            // The turn speeds up: one direction every 220ms at first, every 40ms at the end.
            frame: t < 150 ? DOWN : stepThrough(t, 220 - 180 * u, [DOWN, LEFT, UP, RIGHT]),
            y: 3 * shrink,
            scaleX: 1 - 0.95 * shrink,
            scaleY: 1 - 0.95 * shrink,
            angle: 8 * Math.sin(t / 90) * u,
            alpha: shrink < 0.9 ? 1 : 1 - (shrink - 0.9) / 0.1,
        };
    },
};

/** A beam of light comes down on the Woka, which floats up, stretches and is sucked into it. */
const BEAM_IN = 300;
const BEAM_LIFT = 900;
const BEAM_GONE = 1650;
/** The beam hangs from this height above the feet. */
const BEAM_HEIGHT = 90;

function beamed(withSaucer: boolean): WokaEmoteDefinition<"banned"> {
    const beamAlpha = (t: number) =>
        track(t, 0, [
            { at: BEAM_IN - 150, to: 0 },
            { at: BEAM_IN, to: 0.85 },
            { at: BEAM_GONE, to: 0.85 },
            { at: BEAM_GONE + 400, to: 0 },
        ]);
    const props: WokaEmotePropSpec[] = [
        {
            glyph: "beam",
            sample: (t) => {
                const length = track(t, 0, [
                    { at: BEAM_IN - 150, to: 0 },
                    { at: BEAM_IN, to: 1, ease: "quadOut" },
                    { at: BEAM_GONE + 50, to: 1 },
                    { at: BEAM_GONE + 400, to: 0, ease: "quadIn" },
                ]);
                // Props grow from their bottom: moving the bottom with the length keeps the top in the sky.
                return length > 0
                    ? { x: 0, y: -BEAM_HEIGHT + BEAM_HEIGHT * length, scaleY: length, alpha: beamAlpha(t) }
                    : null;
            },
        },
        {
            glyph: "sparkle",
            sample: (t) =>
                t > BEAM_IN && t < BEAM_GONE
                    ? { x: -6 + 3 * Math.sin(t / 130), y: -10 - (((t - BEAM_IN) / 6) % 55), alpha: 0.9 }
                    : null,
        },
        {
            glyph: "sparkle",
            sample: (t) =>
                t > BEAM_IN + 200 && t < BEAM_GONE
                    ? { x: 6 + 3 * Math.sin(t / 150), y: -4 - (((t - BEAM_IN) / 5) % 60), alpha: 0.9 }
                    : null,
        },
    ];
    if (withSaucer) {
        props.push({
            glyph: "saucer",
            // It comes down to the top of the beam, waits, and flies off with its catch.
            sample: (t) => {
                const y = track(t, -170, [
                    { at: BEAM_IN - 250, to: -96, ease: "quadOut" },
                    { at: BEAM_GONE + 300, to: -96 },
                    { at: BEAM_GONE + 700, to: -180, ease: "quadIn" },
                ]);
                return {
                    x: 0,
                    y,
                    alpha: track(t, 0, [
                        { at: 150, to: 1 },
                        { at: BEAM_GONE + 500, to: 1 },
                        { at: BEAM_GONE + 700, to: 0 },
                    ]),
                };
            },
        });
    }
    return {
        id: "banned",
        duration: withSaucer ? 2400 : 2100,
        icon: "⛓️",
        // A hum, the rising sound of being sucked up and a "pop", timed inside one file.
        sounds: [{ file: "ban-beam.mp3" }],
        // The pool of light on the floor.
        ground: {
            color: 0x8cebff,
            fill: true,
            radius: 14,
            flatten: 0.44,
            arcs: [],
            sample: (t) => {
                const alpha = clamp01(beamAlpha(t) / 0.85);
                return { scale: alpha > 0 ? 0.4 + 0.6 * alpha : 0, alpha: 0.5 * alpha };
            },
        },
        props,
        sample: (t) => {
            const lift = quadIn(clamp01((t - BEAM_LIFT) / (BEAM_GONE - BEAM_LIFT)));
            // Before being sucked up, it floats a little above the floor.
            const float =
                t > BEAM_IN + 150 && t < BEAM_LIFT ? -6 * clamp01((t - BEAM_IN - 150) / 300) + Math.sin(t / 110) : 0;
            return {
                frame: t > BEAM_LIFT ? stepThrough(t, 90, [DOWN, DOWN, UP]) : DOWN,
                y: (t < BEAM_LIFT ? float : -6) - 64 * lift,
                scaleX: 1 - 0.7 * lift,
                scaleY: 1 + 1.2 * lift,
                alpha: lift < 0.7 ? 1 : 1 - (lift - 0.7) / 0.3,
            };
        },
    };
}

export const BAN_SCENES: WokaEmoteDefinition<"banned">[] = [cell, trapdoor, whirlpool, beamed(false), beamed(true)];

/** The scene of a ban, from the roll the back sends: every player sees the same one. */
export function buildBan(roll: number): WokaEmoteDefinition<"banned"> {
    return BAN_SCENES[roll % BAN_SCENES.length];
}
