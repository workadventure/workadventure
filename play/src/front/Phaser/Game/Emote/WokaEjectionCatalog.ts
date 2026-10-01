import type { WokaEmoteDefinition, WokaEmotePropState } from "./WokaEmoteCatalog";
import { oscillate, track } from "./WokaEmoteCatalog";

/**
 * What the other players see when a moderator removes someone: the Woka is kicked off the map (see
 * WokaKickCatalog, which draws the kick at random), or locked up and dragged under it, instead of
 * vanishing like a closed tab.
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
const UP = 10;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const quadIn = (t: number) => t * t;

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

export const BANNED: WokaEmoteDefinition<WokaEjection> = {
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
