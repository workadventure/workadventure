/**
 * NG Academy — Character Life System (config layer)
 * -------------------------------------------------
 * Declarative configuration for the "alive" behaviour of characters.
 * Every timing/pose lives here so new behaviours and seat types can be
 * added WITHOUT touching Character.ts / Player.ts (see DESIGN.md ch. 20).
 *
 * All randomisation is deterministic per character name (hashed seed),
 * so every client in the room renders the same idle behaviour for a given
 * remote player — the school feels alive consistently for everyone.
 */

export interface LifeTimings {
    /** idle "breathing" bob: period range in ms (yoyo half-cycle each way) */
    breathPeriodMs: [number, number];
    /** idle "breathing" bob: amplitude in px */
    breathAmplitudePx: number;
    /** how often a remote character looks around: min/max delay in ms */
    lookAroundEveryMs: [number, number];
    /** how long a look-around lasts: min/max ms */
    lookAroundHoldMs: [number, number];
    /** delay before the first look-around (ms) */
    firstLookAfterMs: [number, number];
    /** walk->idle transition: keep the last walk frame for this many ms */
    stopSettleMs: number;
    /** small "settling step" after stopping, in px */
    stopSettlePx: number;
    /** characters within this distance (px) face a nearby speaker */
    listenRadiusPx: number;
    /** how long a listener faces the speaker: min/max ms */
    listenHoldMs: [number, number];
}

export const DEFAULT_LIFE: LifeTimings = {
    breathPeriodMs: [900, 1700],
    breathAmplitudePx: 1,
    lookAroundEveryMs: [10000, 26000],
    lookAroundHoldMs: [1500, 4200],
    firstLookAfterMs: [2500, 7000],
    stopSettleMs: 150,
    stopSettlePx: 1.4,
    listenRadiusPx: 96,
    listenHoldMs: [2600, 5200],
};

/**
 * Named life profiles, selectable later per map zone (extensibility point).
 * Example future use: an area property `life=lecture` calms students and
 * makes them face the whiteboard. Phase 1 only ships "default".
 */
export const LIFE_PROFILES: Record<string, Partial<LifeTimings>> = {
    default: {},
};

/* ------------------------------------------------------------------ */
/*  Sitting system                                                     */
/* ------------------------------------------------------------------ */

export type SeatType = "chair" | "seat" | "sofa" | "desk";

export interface SeatPose {
    /** sprite scaleY while sitting (crouch factor) */
    scaleY: number;
    /** sprite scaleX while sitting (slight widen for a seated body) */
    scaleX: number;
    /** extra sprite y offset (px) — the seated body sits lower */
    dy: number;
    /** sit/stand transition duration ms */
    transitionMs: number;
}

/**
 * Pose per seat type. Add new seat families here (e.g. "stool", "bench_park")
 * — the client picks the pose from the tileset property `sitType`.
 */
export const SEAT_POSES: Record<SeatType, SeatPose> = {
    chair: { scaleY: 0.74, scaleX: 1.08, dy: 3, transitionMs: 260 },
    seat: { scaleY: 0.78, scaleX: 1.06, dy: 2.4, transitionMs: 260 },
    sofa: { scaleY: 0.8, scaleX: 1.05, dy: 2, transitionMs: 300 },
    desk: { scaleY: 0.72, scaleX: 1.1, dy: 4, transitionMs: 240 },
};

/** tile properties the map must set (build_map.py emits these) */
export const SIT_PROPERTY = "sit";
export const SIT_TYPE_PROPERTY = "sitType";

/** local player must stand still this long (ms) on a seat tile before sitting */
export const SIT_AFTER_STILL_MS = 350;

/* ------------------------------------------------------------------ */
/*  Role by location (phase 2)                                         */
/* ------------------------------------------------------------------ */

/** Tile layer names marking where teaching happens (declared in the map). */
export const ZONE_TEACHER_LAYER = "zones_teacher";
export const ZONE_CLASS_LAYER = "zones_class";

/**
 * "Role by location": ANY character standing on a teacher-zone tile acts as
 * the teacher of that room (real users, not NPCs — no scripted schedules),
 * and idle characters in the matching class zone face the nearest teacher.
 *
 * Extend by adding new layers + entries here; the client logic is generic.
 */
export const ZONE_LIFE = {
    /** how often zone membership under the feet is checked (ms) */
    tickMs: 1500,
    /** teacher: how often they turn to scan the row (min/max ms) */
    teacherScanEveryMs: [6000, 14000] as [number, number],
    /** teacher: how long a scan glance lasts (min/max ms) */
    teacherScanHoldMs: [1800, 4200] as [number, number],
    /** chance that a scan glance looks at the row instead of a random side */
    teacherScanClassBias: 0.55,
    /** student: how long the facing towards the teacher is held (min/max ms) */
    studentFaceHoldMs: [4000, 7500] as [number, number],
    /** max distance (px, ~14 tiles) at which a teacher is perceived in-room */
    maxTeacherDistPx: 448,
    /** tile size in px (matches the school map) */
    tilePx: 32,
};
