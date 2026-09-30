import type { WokaEmoteDefinition, WokaEmotePropState, WokaEmoteState } from "./WokaEmoteCatalog";
import { oscillate, stepThrough, track } from "./WokaEmoteCatalog";

/**
 * What the other players see when a moderator removes someone: the Woka is kicked off the map, or
 * locked up and dragged under it, instead of vanishing like a closed tab.
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
const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
const quadIn = (t: number) => t * t;
const quadOut = (t: number) => 1 - (1 - t) * (1 - t);

/** When the boot connects. */
const KICK_IMPACT = 420;
/** When the Woka leaves the ground, once the squash of the impact has registered. */
const KICK_LIFTOFF = 480;
const KICK_FLIGHT = 1050;
/** Where the Woka ends up, relative to where it stood: up and away, like a cartoon villain. */
const KICK_LANDING = { x: 40, y: -52 };
const KICK_STAR_AT = 1500;

/** When the cell hits the floor. */
const BAN_LANDING = 420;
const BAN_SINK_START = 1650;
const BAN_SINK_DURATION = 800;

/** The Team Rocket exit: spinning through the four directions while shrinking into the distance. */
function flight(elapsed: number): Partial<WokaEmoteState> {
    const progress = clamp01((elapsed - KICK_LIFTOFF) / KICK_FLIGHT);
    const eased = cubicOut(progress);
    const scale = 1 - 0.86 * eased;
    return {
        frame: stepThrough(elapsed, 80, [DOWN, LEFT, UP, RIGHT]),
        x: KICK_LANDING.x * eased,
        y: KICK_LANDING.y * eased - 6 * Math.sin(progress * Math.PI),
        angle: 1080 * quadOut(progress),
        scaleX: scale,
        scaleY: scale,
        alpha: progress < 0.82 ? 1 : 1 - (progress - 0.82) / 0.18,
    };
}

/** The twinkle left where the Woka disappeared. */
function star(elapsed: number): WokaEmotePropState | null {
    const since = elapsed - KICK_STAR_AT;
    if (since < 0) return null;
    const scale = track(since, 0, [
        { at: 160, to: 1.5, ease: "backOut" },
        { at: 300, to: 1 },
    ]);
    return {
        ...KICK_LANDING,
        angle: track(since, 0, [{ at: 600, to: 90, ease: "quadOut" }]),
        scaleX: scale,
        scaleY: scale,
        alpha: since < 450 ? 1 : clamp01(1 - (since - 450) / 250),
    };
}

/** The flash of the blow, at the Woka's side. */
function impact(elapsed: number): WokaEmotePropState | null {
    const since = elapsed - KICK_IMPACT;
    if (since < 0 || since > 240) return null;
    const scale = 0.6 + (since / 240) * 0.9;
    return { x: -8, y: -8, scaleX: scale, scaleY: scale, alpha: 1 - since / 240 };
}

const kicked: WokaEmoteDefinition<WokaEjection> = {
    id: "kicked",
    duration: 2200,
    icon: "🥾",
    // One file for the whole scene — the bonk, the slide whistle of the flight and the "ding" of
    // the star are timed inside it — so it starts with the blow.
    sound: { file: "kicked.mp3", at: KICK_IMPACT },
    props: [
        {
            glyph: "boot",
            // It comes in from the left, winds up, swings through the Woka, then withdraws.
            sample: (t) =>
                t >= 860
                    ? null
                    : {
                          x: track(t, -40, [
                              { at: 120, to: -34, ease: "quadOut" },
                              { at: 280, to: -38, ease: "quadOut" },
                              { at: KICK_IMPACT, to: -13, ease: "quadIn" },
                              { at: 620, to: -16, ease: "quadOut" },
                              { at: 860, to: -44, ease: "quadIn" },
                          ]),
                          y: -1,
                          angle: track(t, -10, [
                              { at: 280, to: -28, ease: "quadOut" },
                              { at: KICK_IMPACT, to: 8, ease: "quadIn" },
                              { at: 700, to: 0 },
                          ]),
                          alpha: t < 60 ? t / 60 : t > 760 ? 1 - (t - 760) / 100 : 1,
                      },
        },
        { glyph: "impact", sample: impact },
        { glyph: "star", sample: star },
    ],
    sample: (t) => {
        if (t >= KICK_LIFTOFF) return flight(t);
        const hit = t > KICK_IMPACT;
        return {
            // It turns towards the boot just before it lands.
            frame: t > 150 ? LEFT : DOWN,
            x: hit ? 2 : 0,
            scaleX: track(t, 1, [
                { at: KICK_IMPACT, to: 1 },
                { at: KICK_IMPACT + 40, to: 1.18, ease: "quadOut" },
            ]),
            scaleY: track(t, 1, [
                { at: KICK_IMPACT, to: 1 },
                { at: KICK_IMPACT + 40, to: 0.86, ease: "quadOut" },
            ]),
        };
    },
};

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

const banned: WokaEmoteDefinition<WokaEjection> = {
    id: "banned",
    duration: 2600,
    icon: "⛓️",
    // The clang of the landing, the rattle of the bars and the fall, timed inside one file.
    sound: { file: "banned.mp3", at: BAN_LANDING },
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

const EJECTIONS: Record<WokaEjection, WokaEmoteDefinition<WokaEjection>> = { kicked, banned };

export const WOKA_EJECTIONS = Object.values(EJECTIONS);

export function getWokaEjection(ejection: WokaEjection): WokaEmoteDefinition<WokaEjection> {
    return EJECTIONS[ejection];
}
