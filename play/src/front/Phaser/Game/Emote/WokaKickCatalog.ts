import type {
    WokaEmoteDefinition,
    WokaEmoteGroundSpec,
    WokaEmotePropSpec,
    WokaEmotePropState,
    WokaEmoteSoundSpec,
    WokaEmoteState,
} from "./WokaEmoteCatalog";
import { stepThrough, track } from "./WokaEmoteCatalog";

/**
 * The kick of a moderator, drawn at random so that it does not get old.
 *
 * The back sends what is known for sure: the side the moderator stands on, whether they stand close
 * enough to give the kick themselves (`melee`), and a random `roll`. Every client derives the same
 * scene from it here: a strike (how the blow lands) and a flight (how the Woka leaves). Adding a
 * variant is therefore a front-only change.
 *
 * Every recipe is written with the moderator on the left of the target; the animator mirrors it for
 * the other side. Times are in milliseconds, distances in world pixels from the target's feet.
 */

const DOWN = 1;
const LEFT = 4;
const RIGHT = 7;
const UP = 10;
const WALK_RIGHT = [6, 7, 8, 7];
const WALK_LEFT = [3, 4, 5, 4];
const WALK_UP = [9, 10, 11, 10];
const WALK_DOWN = [0, 1, 2, 1];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const quadIn = (t: number) => t * t;
const quadOut = (t: number) => 1 - (1 - t) * (1 - t);
const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** 0 → 1 → 0: the height of a throw. */
const hump = (u: number) => 4 * u * (1 - u);

/** Where the kicker stands to hit: beside the target, on its floor line. */
export const KICK_REACH = 18;
/** The kicker's run, about twice the walking speed. */
const RUN_SPEED = 0.22;
/** When the kicker sets off. */
const APPROACH_START = 120;
/** Between the blow and the target leaving the ground. */
const LIFTOFF_DELAY = 60;
const WAVE_RELEASE = 280;
const WAVE_SPEED = 0.35;
/** A wave never comes from further than this, so that the target does not wait for it. */
const WAVE_MAX_DISTANCE = 180;
/** Where a wave starts when the moderator is not on this player's screen. */
const WAVE_DEFAULT_START = { x: -96, y: 0 };
/** The belly, around which a Woka in the air tumbles: 13px above its feet. */
const BELLY = 13;

/** Where the moderator stands relative to the target, in the recipe's frame (moderator on the left). */
export interface KickGap {
    x: number;
    y: number;
}

export interface KickStrike {
    id: string;
    build(gap: KickGap | undefined): {
        impact: number;
        props: WokaEmotePropSpec[];
        /** What the moderator's own Woka does, when it takes part. */
        kicker?: WokaEmoteDefinition<"kick">;
    };
}

/** The target in the air: `x`/`y` on the floor, `alt` above it, so that a shadow can stay below. */
interface FlightState {
    frame: number;
    x: number;
    y?: number;
    alt: number;
    angle: number;
    scale: number;
    scaleY?: number;
    alpha: number;
    /** How much of the shadow to draw, 0 to 1. */
    shadow: number;
}

export interface KickFlight {
    id: string;
    /** From liftoff to the end of the scene, tail included. */
    duration: number;
    sample(since: number): FlightState;
    /** Props and sounds, timed from liftoff. */
    props?: WokaEmotePropSpec[];
    sounds?: WokaEmoteSoundSpec[];
}

/* -------------------------------------------------------------------------- */
/* Strikes                                                                     */
/* -------------------------------------------------------------------------- */

interface Pose {
    angle: number;
    push: number;
    scaleX: number;
    scaleY?: number;
    y?: number;
    frame?: number;
}

/** No leg to draw: the kicker leans back for momentum, then throws its whole body forward. */
function kickPose(t: number, at: number): Pose {
    return {
        angle: track(t, 0, [
            { at: at - 180, to: 0 },
            { at: at - 30, to: -14, ease: "quadOut" },
            { at: at + 10, to: 20, ease: "quadIn" },
            { at: at + 220, to: 20 },
            { at: at + 380, to: 0, ease: "quadOut" },
        ]),
        push: track(t, 0, [
            { at: at - 30, to: 0 },
            { at: at + 10, to: 6, ease: "quadIn" },
            { at: at + 220, to: 6 },
            { at: at + 380, to: 0, ease: "quadOut" },
        ]),
        scaleX: track(t, 1, [
            { at: at - 180, to: 1 },
            { at: at - 30, to: 0.92 },
            { at: at + 10, to: 1.1 },
            { at: at + 380, to: 1 },
        ]),
    };
}

function approachFrame(to: KickGap, t: number, returning: boolean): number {
    if (Math.abs(to.y) > Math.abs(to.x)) {
        return stepThrough(t, 60, to.y < 0 !== returning ? WALK_UP : WALK_DOWN);
    }
    return stepThrough(t, 60, to.x >= 0 !== returning ? WALK_RIGHT : WALK_LEFT);
}

/**
 * A kick given by the moderator's own Woka: it runs to the target's side, strikes, and runs back.
 * Only its layer sprites move; its position, its name and what the server knows stay where they are.
 */
function meleeStrike(id: string, windup: number, pose: (t: number, at: number) => Pose): KickStrike {
    return {
        id,
        build(gap) {
            // A melee strike is only drawn with the moderator on screen; the fallback keeps the type total.
            const from = gap ?? { x: -KICK_REACH, y: 0 };
            const to = { x: -KICK_REACH - from.x, y: -from.y };
            const run = Math.max(1, Math.hypot(to.x, to.y) / RUN_SPEED);
            const arrive = APPROACH_START + run;
            const impact = arrive + windup;
            const back = impact + 500;
            const end = back + run;
            return {
                impact,
                props: [],
                kicker: {
                    id: "kick",
                    icon: "🥾",
                    duration: end,
                    sample: (t) => {
                        const travel = clamp01((t - APPROACH_START) / run) - clamp01((t - back) / run);
                        const moving = (t > APPROACH_START && t < arrive) || (t > back && t < end);
                        const p = moving ? undefined : pose(t, impact);
                        return {
                            frame: moving ? approachFrame(to, t, t > back) : (p?.frame ?? RIGHT),
                            x: to.x * travel + (p?.push ?? 0),
                            y: to.y * travel + (p?.y ?? 0) - (moving ? Math.abs(Math.sin(t / 60)) * 1.5 : 0),
                            angle: p?.angle ?? 0,
                            scaleX: p?.scaleX ?? 1,
                            scaleY: p?.scaleY ?? 1,
                        };
                    },
                },
            };
        },
    };
}

export const MELEE_STRIKES: KickStrike[] = [
    // Leans back for momentum, then throws itself forward.
    meleeStrike("lunge", 200, kickPose),
    // A full turn on the spot (the sprite's four directions), then the kick in the same motion.
    meleeStrike("spin", 380, (t, at) => ({
        ...kickPose(t, at),
        frame: t > at - 380 && t < at - 40 ? stepThrough(t - (at - 380), 70, [DOWN, LEFT, UP, RIGHT]) : RIGHT,
    })),
    // No wind-up: it comes in leaning forward and rams the target, squashed by the shock.
    meleeStrike("charge", 120, (t, at) => ({
        angle: track(t, 0, [
            { at: at - 120, to: 0 },
            { at: at - 20, to: 16, ease: "quadIn" },
            { at: at + 200, to: 16 },
            { at: at + 360, to: 0, ease: "quadOut" },
        ]),
        push: track(t, 0, [
            { at: at - 20, to: 0 },
            { at: at + 30, to: 10, ease: "quadOut" },
            { at: at + 200, to: 10 },
            { at: at + 360, to: 0, ease: "quadOut" },
        ]),
        scaleX: track(t, 1, [
            { at, to: 1 },
            { at: at + 40, to: 1.15, ease: "quadOut" },
            { at: at + 360, to: 1 },
        ]),
        scaleY: track(t, 1, [
            { at, to: 1 },
            { at: at + 40, to: 0.9, ease: "quadOut" },
            { at: at + 360, to: 1 },
        ]),
    })),
    // Jumps, and lands on the target throwing itself forward.
    meleeStrike("jump", 280, (t, at) => ({
        y: track(t, 0, [
            { at: at - 280, to: 0 },
            { at: at - 120, to: -14, ease: "quadOut" },
            { at, to: -4, ease: "quadIn" },
            { at: at + 120, to: 0, ease: "quadIn" },
        ]),
        angle: track(t, 0, [
            { at: at - 120, to: 0 },
            { at, to: 24, ease: "quadIn" },
            { at: at + 220, to: 24 },
            { at: at + 380, to: 0, ease: "quadOut" },
        ]),
        push: track(t, 0, [
            { at: at - 120, to: 0 },
            { at, to: 6, ease: "quadIn" },
            { at: at + 220, to: 6 },
            { at: at + 380, to: 0 },
        ]),
        scaleX: 1,
    })),
];

/** A boot swings in from the moderator's side. */
const boot: KickStrike = {
    id: "boot",
    build: () => ({
        impact: 420,
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
                                  { at: 420, to: -13, ease: "quadIn" },
                                  { at: 620, to: -16, ease: "quadOut" },
                                  { at: 860, to: -44, ease: "quadIn" },
                              ]),
                              y: -1,
                              angle: track(t, -10, [
                                  { at: 280, to: -28, ease: "quadOut" },
                                  { at: 420, to: 8, ease: "quadIn" },
                                  { at: 700, to: 0 },
                              ]),
                              alpha: t < 60 ? t / 60 : t > 760 ? 1 - (t - 760) / 100 : 1,
                          },
            },
        ],
    }),
};

/** The moderator kicks the air where they stand, and a wave crosses the map to the target. */
const wave: KickStrike = {
    id: "wave",
    build(gap) {
        const length = gap ? Math.hypot(gap.x, gap.y) : 0;
        const start =
            gap && length > 0
                ? {
                      x: (gap.x * Math.min(length, WAVE_MAX_DISTANCE)) / length,
                      y: (gap.y * Math.min(length, WAVE_MAX_DISTANCE)) / length,
                  }
                : WAVE_DEFAULT_START;
        const end = { x: -10, y: 0 };
        const travel = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y) / WAVE_SPEED);
        const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
        return {
            impact: WAVE_RELEASE + travel,
            props: [
                {
                    glyph: "wave",
                    sample: (t) => {
                        const f = (t - WAVE_RELEASE) / travel;
                        if (f < 0 || f >= 1) return null;
                        // At body height, 10px above the floor.
                        return { x: start.x + (end.x - start.x) * f, y: start.y + (end.y - start.y) * f - 10, angle };
                    },
                },
            ],
            kicker: gap
                ? {
                      id: "kick",
                      icon: "🥾",
                      duration: WAVE_RELEASE + 400,
                      sample: (t) => {
                          const p = kickPose(t, WAVE_RELEASE);
                          return { frame: RIGHT, x: p.push, angle: p.angle, scaleX: p.scaleX };
                      },
                  }
                : undefined,
        };
    },
};

export const RANGED_STRIKES: KickStrike[] = [boot, wave];

/* -------------------------------------------------------------------------- */
/* Flights                                                                     */
/* -------------------------------------------------------------------------- */

const spinFrames = (since: number) => stepThrough(since, 80, [DOWN, LEFT, UP, RIGHT]);
const fadeOut = (u: number, from: number) => (u < from ? 1 : 1 - (u - from) / (1 - from));

/** The twinkle left where the Woka disappeared. */
function starAt(at: number, x: number, y: number): WokaEmotePropSpec {
    return {
        glyph: "star",
        sample: (since): WokaEmotePropState | null => {
            const t = since - at;
            if (t < 0 || t >= 700) return null;
            const scale = track(t, 0, [
                { at: 160, to: 1.5, ease: "backOut" },
                { at: 300, to: 1 },
            ]);
            return {
                x,
                y,
                angle: track(t, 0, [{ at: 600, to: 90, ease: "quadOut" }]),
                scaleX: scale,
                scaleY: scale,
                alpha: t < 450 ? 1 : clamp01(1 - (t - 450) / 250),
            };
        },
    };
}

const WHISTLE: WokaEmoteSoundSpec = { file: "kick-whistle.mp3" };
const ding = (at: number): WokaEmoteSoundSpec => ({ file: "kick-ding.mp3", at });
const land = (at: number): WokaEmoteSoundSpec => ({ file: "kick-land.mp3", at });

/** Three hops, each lower than the last. */
function hops(u: number): number {
    for (const [from, to, height] of [
        [0, 0.45, 44],
        [0.45, 0.78, 22],
        [0.78, 1, 10],
    ]) {
        if (u >= from && u < to) return height * hump((u - from) / (to - from));
    }
    return 0;
}

export const KICK_FLIGHTS: KickFlight[] = [
    {
        // Up and away on a diagonal, shrinking into a star: the Team Rocket exit.
        id: "diagonal",
        duration: 1720,
        sample: (since) => {
            const u = clamp01(since / 1050);
            const e = cubicOut(u);
            return {
                frame: spinFrames(since),
                x: 40 * e,
                y: -52 * e - 6 * Math.sin(u * Math.PI),
                alt: 0,
                angle: 1080 * quadOut(u),
                scale: 1 - 0.86 * e,
                alpha: fadeOut(u, 0.82),
                shadow: 0,
            };
        },
        props: [starAt(1020, 40, -52)],
        sounds: [WHISTLE, ding(1020)],
    },
    {
        // Rises towards the camera (it grows), then dwindles into the distance.
        id: "rocket",
        duration: 1820,
        sample: (since) => {
            const u = clamp01(since / 1150);
            const up = clamp01(u / 0.35);
            const away = clamp01((u - 0.35) / 0.65);
            return {
                frame: spinFrames(since),
                x: 18 * quadOut(up) + 30 * quadIn(away),
                alt: 26 * quadOut(up) + 60 * quadIn(away),
                angle: 1080 * quadOut(u),
                scale: u < 0.35 ? 1 + 0.6 * quadOut(up) : 1.6 - 1.48 * quadIn(away),
                alpha: fadeOut(u, 0.86),
                shadow: 1 - up * 0.4 - away * 0.6,
            };
        },
        props: [starAt(1120, 48, -86)],
        sounds: [WHISTLE, ding(1120)],
    },
    {
        // A real throw: grows at the top, lands five tiles away in a puff of dust, then fades.
        id: "arc",
        duration: 1720,
        sample: (since) => {
            if (since >= 1100) {
                const k = since - 1100;
                const squash = 0.15 * clamp01(1 - k / 200);
                const gone = clamp01(1 - (k - 250) / 350);
                return {
                    frame: DOWN,
                    x: 150,
                    alt: 0,
                    angle: 0,
                    scale: 1 + squash,
                    scaleY: 1 - squash,
                    alpha: gone,
                    shadow: gone,
                };
            }
            const u = since / 1100;
            const h = hump(u);
            return {
                frame: spinFrames(since),
                x: 150 * u,
                alt: 70 * h,
                angle: 720 * u,
                scale: 1 + 0.35 * h,
                alpha: 1,
                shadow: 1 - 0.5 * h,
            };
        },
        props: [
            {
                glyph: "dust",
                sample: (since) => {
                    const k = since - 1100;
                    if (k < 0 || k >= 450) return null;
                    return { x: 150, y: -1 - k / 150, scaleX: 1 + k / 300, scaleY: 1 + k / 300, alpha: 1 - k / 450 };
                },
            },
        ],
        sounds: [WHISTLE, land(1100)],
    },
    {
        // The same throw, but it shrinks on the way down, as if falling far away, and ends in a star.
        id: "arc-shrink",
        duration: 1820,
        sample: (since) => {
            const u = clamp01(since / 1100);
            const h = hump(u);
            const scale = u < 0.5 ? 1 + 0.35 * h : 1.35 - 1.2 * quadIn((u - 0.5) / 0.5);
            return {
                frame: spinFrames(since),
                x: 150 * u,
                alt: 70 * h,
                angle: 720 * u,
                scale,
                alpha: fadeOut(u, 0.85),
                shadow: (1 - 0.5 * h) * Math.min(1, scale),
            };
        },
        props: [starAt(1100, 150, -4)],
        sounds: [WHISTLE, ding(1100)],
    },
    {
        // Straight at the camera: it grows to four times its size and vanishes in a small flash.
        id: "camera",
        duration: 1420,
        sample: (since) => {
            const u = clamp01(since / 800);
            const e = quadIn(u);
            return {
                frame: spinFrames(since),
                x: 10 * e,
                alt: 30 * e,
                angle: 540 * u,
                scale: 1 + 3 * e,
                alpha: fadeOut(u, 0.7),
                shadow: 1 - u,
            };
        },
        props: [
            {
                glyph: "flash",
                sample: (since) => {
                    const k = since - 760;
                    if (k < 0 || k >= 260) return null;
                    // Kept small and local: props are drawn above everything, roofs included.
                    const scale = 1.5 + k / 80;
                    return { x: 10, y: -46, scaleX: scale, scaleY: scale, alpha: 1 - k / 260 };
                },
            },
        ],
        sounds: [WHISTLE],
    },
    {
        // Three hops along the floor, the shadow carrying the height; it fades out before any screen edge.
        id: "bounce",
        duration: 1820,
        sample: (since) => {
            const u = clamp01(since / 1500);
            const alt = hops(u);
            return {
                frame: spinFrames(since),
                x: 260 * u,
                alt,
                angle: 900 * u,
                scale: 1 + alt / 150,
                alpha: fadeOut(u, 0.88),
                shadow: 1 - alt / 90,
            };
        },
        sounds: [land(675), land(1170)],
    },
    {
        // The same hops, shrinking all along, and a star at the last touch of the floor.
        id: "bounce-shrink",
        duration: 2220,
        sample: (since) => {
            const u = clamp01(since / 1500);
            const alt = hops(u);
            const scale = (1 - 0.82 * quadIn(u)) * (1 + alt / 150);
            return {
                frame: spinFrames(since),
                x: 170 * quadOut(u),
                alt,
                angle: 900 * u,
                scale,
                alpha: fadeOut(u, 0.88),
                shadow: (1 - alt / 90) * Math.min(1, scale),
            };
        },
        props: [starAt(1500, 170, -4)],
        sounds: [land(675), land(1170), ding(1500)],
    },
];

/** Every sound a kick can play, for the preloader. */
export const KICK_SOUNDS: WokaEmoteSoundSpec[] = [
    "kick-hit.mp3",
    "kick-whistle.mp3",
    "kick-ding.mp3",
    "kick-land.mp3",
].map((file) => ({ file }));

/* -------------------------------------------------------------------------- */
/* Composition                                                                 */
/* -------------------------------------------------------------------------- */

/** Before liftoff: the target turns towards the blow, then takes it. */
function windup(t: number, impact: number): Partial<WokaEmoteState> {
    return {
        frame: t > impact - 270 ? LEFT : DOWN,
        x: t > impact ? 2 : 0,
        scaleX: track(t, 1, [
            { at: impact, to: 1 },
            { at: impact + 40, to: 1.18, ease: "quadOut" },
        ]),
        scaleY: track(t, 1, [
            { at: impact, to: 1 },
            { at: impact + 40, to: 0.86, ease: "quadOut" },
        ]),
    };
}

function impactFlash(impact: number): WokaEmotePropSpec {
    return {
        glyph: "impact",
        sample: (t) => {
            const k = t - impact;
            if (k < 0 || k > 240) return null;
            const scale = 0.6 + (k / 240) * 0.9;
            return { x: -8, y: -8, scaleX: scale, scaleY: scale, alpha: 1 - k / 240 };
        },
    };
}

/**
 * The animator turns a Woka around its feet; in the air it should tumble around its belly. This
 * shifts it so that the belly stays put whatever the angle (and the mirror keeps it right: sin is odd).
 */
function aroundBelly(state: Partial<WokaEmoteState>): Partial<WokaEmoteState> {
    const radians = ((state.angle ?? 0) * Math.PI) / 180;
    const height = BELLY * (state.scaleY ?? 1);
    return {
        ...state,
        x: (state.x ?? 0) - height * Math.sin(radians),
        y: (state.y ?? 0) - height * (1 - Math.cos(radians)),
    };
}

function lifted(f: FlightState): Partial<WokaEmoteState> {
    return aroundBelly({
        frame: f.frame,
        x: f.x,
        y: (f.y ?? 0) - f.alt,
        angle: f.angle,
        scaleX: f.scale,
        scaleY: f.scaleY ?? f.scale,
        alpha: f.alpha,
    });
}

/** A flattened dark disc on the floor, under the Woka in flight. Wokas have none at rest. */
const SHADOW: Omit<WokaEmoteGroundSpec, "sample"> = { color: 0x141e0a, radius: 10, flatten: 0.3, fill: true, arcs: [] };

function delayed(prop: WokaEmotePropSpec, by: number): WokaEmotePropSpec {
    return { glyph: prop.glyph, sample: (t) => (t < by ? null : prop.sample(t - by)) };
}

/**
 * The scene of a kick, from the back's roll. The flight depends on the roll alone, so every player
 * sees the same one; the strike also depends on whether the moderator is on this player's screen
 * (`gap`), since a melee strike needs their Woka.
 */
export function buildKick(
    roll: number,
    melee: boolean,
    gap?: KickGap,
): { strike: string; flight: string; target: WokaEmoteDefinition<"kicked">; kicker?: WokaEmoteDefinition<"kick"> } {
    const pool = melee && gap ? MELEE_STRIKES : RANGED_STRIKES;
    const strike = pool[roll % pool.length];
    const flight = KICK_FLIGHTS[(roll >>> 16) % KICK_FLIGHTS.length];
    const { impact, props, kicker } = strike.build(gap);
    const liftoff = impact + LIFTOFF_DELAY;
    const fly = (t: number) => flight.sample(t - liftoff);
    return {
        strike: strike.id,
        flight: flight.id,
        kicker,
        target: {
            id: "kicked",
            icon: "🥾",
            duration: liftoff + flight.duration,
            props: [...props, impactFlash(impact), ...(flight.props ?? []).map((prop) => delayed(prop, liftoff))],
            ground: {
                ...SHADOW,
                sample: (t) => {
                    if (t < liftoff) return { alpha: 0 };
                    const f = fly(t);
                    return {
                        x: f.x,
                        scale: Math.max(0.3, 1 - f.alt / 120),
                        // Fades in over 80ms at liftoff, and with the Woka at the end.
                        alpha:
                            0.38 *
                            clamp01(f.shadow) *
                            Math.max(0.25, 1 - f.alt / 110) *
                            clamp01((t - liftoff) / 80) *
                            f.alpha,
                    };
                },
            },
            sounds: [
                { file: "kick-hit.mp3", at: impact },
                ...(flight.sounds ?? []).map((sound) => ({ ...sound, at: (sound.at ?? 0) + liftoff })),
            ],
            sample: (t) => (t < liftoff ? windup(t, impact) : lifted(fly(t))),
        },
    };
}
