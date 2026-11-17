import type { WokaEmoteDefinition, WokaEmoteGroundSpec, WokaEmotePropSpec } from "./WokaEmoteCatalog";
import { track } from "./WokaEmoteCatalog";

/**
 * What the other players see when someone joins the map or leaves it, instead of a Woka popping in
 * or vanishing: a column of light comes down, and the Woka takes shape in it, or is drawn up into it.
 *
 * Only the back knows whether a Woka is really arriving or leaving, as opposed to coming into view or
 * walking out of it, or reconnecting from the same tab: these play from UserJoinedMessage.arrived and
 * UserLeftMessage.departed. Like the ejections, they are not in WOKA_EMOTE_IDS, so no player can play
 * them on purpose. They are silent: a meeting room filling up would otherwise chime without end.
 */
export type WokaTeleport = "teleportIn" | "teleportOut";

const DURATION = 900;
/** The column reaches the floor. */
const BEAM_DOWN = 200;
/** The column starts fading away. */
const BEAM_UP = 700;
/** The column hangs from this height above the feet. */
const BEAM_HEIGHT = 80;
/** The Woka takes shape, or comes apart, between these two instants. */
const SHAPE_START = 250;
const SHAPE_END = 700;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const shaping = (t: number) => clamp01((t - SHAPE_START) / (SHAPE_END - SHAPE_START));

const beamAlpha = (t: number) =>
    track(t, 0, [
        { at: BEAM_DOWN, to: 0.85, ease: "quadOut" },
        { at: BEAM_UP, to: 0.85 },
        { at: DURATION, to: 0, ease: "quadIn" },
    ]);

const props: WokaEmotePropSpec[] = [
    {
        glyph: "beam",
        sample: (t) => {
            const length = track(t, 0, [
                { at: BEAM_DOWN, to: 1, ease: "quadOut" },
                { at: BEAM_UP, to: 1 },
                { at: DURATION, to: 0, ease: "quadIn" },
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
            t > BEAM_DOWN && t < BEAM_UP
                ? { x: -7 + 2 * Math.sin(t / 90), y: -6 - (((t - BEAM_DOWN) / 5) % 40), alpha: 0.9 }
                : null,
    },
    {
        glyph: "sparkle",
        sample: (t) =>
            t > BEAM_DOWN + 120 && t < BEAM_UP
                ? { x: 7 + 2 * Math.sin(t / 110), y: -14 - (((t - BEAM_DOWN) / 4) % 40), alpha: 0.9 }
                : null,
    },
];

/** The pool of light the column casts on the floor. */
const ground: WokaEmoteGroundSpec = {
    color: 0x8cebff,
    fill: true,
    radius: 12,
    flatten: 0.44,
    arcs: [],
    sample: (t) => {
        const alpha = clamp01(beamAlpha(t) / 0.85);
        return { scale: alpha > 0 ? 0.4 + 0.6 * alpha : 0, alpha: 0.5 * alpha };
    },
};

/** The Woka takes shape in the column: thin and tall at first, flickering, then itself. */
export const TELEPORT_IN: WokaEmoteDefinition<WokaTeleport> = {
    id: "teleportIn",
    duration: DURATION,
    icon: "✨",
    ground,
    props,
    sample: (t) => {
        const u = shaping(t);
        const flicker = u > 0 && u < 1 ? 0.75 + 0.25 * Math.sin(t / 25) : 1;
        return {
            scaleX: 0.2 + 0.8 * u,
            scaleY: 1.8 - 0.8 * u,
            alpha: u * flicker,
        };
    },
};

/** The Woka is drawn up into the column: it stretches, thins out and fades. */
export const TELEPORT_OUT: WokaEmoteDefinition<WokaTeleport> = {
    id: "teleportOut",
    duration: DURATION,
    icon: "✨",
    ground,
    props,
    sample: (t) => {
        const u = shaping(t);
        const flicker = u > 0 && u < 1 ? 0.75 + 0.25 * Math.sin(t / 25) : 1;
        return {
            y: u > 0 ? -10 * u * u : 0,
            scaleX: 1 - 0.8 * u,
            scaleY: 1 + 0.8 * u,
            alpha: (1 - u) * flicker,
        };
    },
};

/** No teleport for this long after joining the room: the Wokas already there are not arriving. */
export const TELEPORT_QUIET_AFTER_JOIN = 3000;
/** At most this many teleports start within a second; any more and the Wokas just pop in or out. */
export const TELEPORT_MAX_PER_SECOND = 3;

/**
 * Whether a teleport may start at `now`, given when this player joined the room and when the last
 * teleports started. Keeps `recent` to the last second, and records `now` in it when it says yes.
 */
export function claimTeleport(now: number, joinedAt: number | undefined, recent: number[]): boolean {
    if (joinedAt === undefined || now - joinedAt < TELEPORT_QUIET_AFTER_JOIN) {
        return false;
    }
    while (recent.length > 0 && now - recent[0] >= 1000) {
        recent.shift();
    }
    if (recent.length >= TELEPORT_MAX_PER_SECOND) {
        return false;
    }
    recent.push(now);
    return true;
}
