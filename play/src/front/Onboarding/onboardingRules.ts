import { z } from "zod";
import { get, type Readable } from "svelte/store";
import type { OnboardingAnchor } from "@workadventure/messages";

/**
 * Onboarding items and the rules that decide which one starts. Pure functions only, so they can be tested without
 * a game scene. See DESIGN_onboarding.md.
 */

/** A text read at display time, so it follows the current locale. */
export type Text = () => string;

interface StepBase {
    /** The step never shows to someone who already clicked this anchor. */
    skipIfUsed?: OnboardingAnchor;
}

interface StepContent {
    title?: Text;
    text: Text;
    /** URLs. */
    image?: string;
    video?: string;
}

/** Centered. Next, or "Got it" on the last step; "Show me" and "Not now" when it leads into other steps. */
export interface ModalStep extends StepBase, StepContent {
    type: "modal";
}

export interface PopoverStep extends StepBase, StepContent {
    type: "popover";
    anchor: OnboardingAnchor;
    side?: "top" | "right" | "bottom" | "left";
    /** "next": a Next button. "click": the user clicks the anchor itself. */
    advance?: "next" | "click";
}

/** Built-in items only: waits for the avatar to move. */
export interface MovementStep extends StepBase {
    type: "movement";
}

/**
 * Built-in items only: a fake user walks up and opens a fake bubble, until the item ends. The texts show in a popover
 * below the fake user's video.
 */
export interface SimulatedConversationStep extends StepBase, StepContent {
    type: "simulatedConversation";
}

export type OnboardingStep = ModalStep | PopoverStep | MovementStep | SimulatedConversationStep;

export interface OnboardingItem {
    /** Unique and stable: the state is keyed by it. Built-in ids start with "wa.". */
    id: string;
    /**
     * Drives scheduling. A tour waits for the start delay, an announcement and the tutorial do not. "tutorial" is
     * built-in only.
     */
    kind: "tour" | "announcement" | "tutorial";
    /** Its name in the Help menu. */
    title: Text;
    audience?: {
        /** The user has at least one of them. */
        tags?: string[];
        /** The user has none of them. */
        excludeTags?: string[];
        /** true: guests only. false: logged users only. */
        guests?: boolean;
        /** true: touch devices only. false: the others. */
        touch?: boolean;
        /** Built-in items only: a condition the tags cannot express, such as map editor rights. */
        allowed?: Readable<boolean>;
    };
    when?: {
        /** Day 0 is `firstVisit`. */
        minDaysSinceFirstVisit?: number;
        maxDaysSinceFirstVisit?: number;
        /** ISO date. */
        expiresAt?: string;
        /** An item that must be over first, and optionally how long ago it ended. */
        after?: string | { item: string; minHours: number };
        /** Start when this anchor appears. */
        onAnchor?: OnboardingAnchor;
    };
    /** Built-in items only: ends the item as done when it turns true. Already true, the item is skipped. */
    doneWhen?: Readable<boolean>;
    steps: OnboardingStep[];
}

export const OnboardingState = z.object({
    /** Local date, YYYY-MM-DD. */
    firstVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    optedOut: z.literal(true).optional(),
    lastAutoStartAt: z.string().optional(),
    /** `at` is when the item ended, for `after`. */
    items: z.record(z.object({ status: z.enum(["done", "dismissed", "skipped"]), at: z.string() })),
    /** Anchors clicked at least once. Plain strings, so a removed anchor does not invalidate the state. */
    used: z.array(z.string()),
});
export type OnboardingState = z.infer<typeof OnboardingState>;

export interface OnboardingContext {
    now: Date;
    tags: string[];
    isGuest: boolean;
    isTouch: boolean;
    quietPeriodMinutes: number;
    /** The user has been in the world for `ONBOARDING_START_DELAY` seconds. */
    startDelayOver: boolean;
    anchorVisible: (anchor: OnboardingAnchor) => boolean;
}

export function localDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function newState(now: Date): OnboardingState {
    return { firstVisit: localDate(now), items: {}, used: [] };
}

/** Calendar days from the first visit to `now`, in local time. */
export function daysSinceFirstVisit(state: OnboardingState, now: Date): number {
    const [year, month, day] = state.firstVisit.split("-").map(Number);
    const first = Date.UTC(year, month - 1, day);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - first) / 86_400_000);
}

export function inAudience(item: OnboardingItem, ctx: OnboardingContext): boolean {
    const audience = item.audience;
    if (!audience) {
        return true;
    }
    if (audience.tags && !audience.tags.some((tag) => ctx.tags.includes(tag))) {
        return false;
    }
    if (audience.excludeTags?.some((tag) => ctx.tags.includes(tag))) {
        return false;
    }
    if (audience.guests !== undefined && audience.guests !== ctx.isGuest) {
        return false;
    }
    if (audience.touch !== undefined && audience.touch !== ctx.isTouch) {
        return false;
    }
    return audience.allowed === undefined || get(audience.allowed);
}

function expired(item: OnboardingItem, now: Date): boolean {
    return item.when?.expiresAt !== undefined && now.getTime() >= Date.parse(item.when.expiresAt);
}

/** An item that can never show to this user does not hold back the items that come `after` it. */
function isOver(id: string, items: OnboardingItem[], state: OnboardingState, ctx: OnboardingContext): boolean {
    if (state.items[id]) {
        return true;
    }
    const item = items.find((candidate) => candidate.id === id);
    return item === undefined || !inAudience(item, ctx) || expired(item, ctx.now);
}

function afterSatisfied(
    item: OnboardingItem,
    items: OnboardingItem[],
    state: OnboardingState,
    ctx: OnboardingContext,
): boolean {
    const after = item.when?.after;
    if (after === undefined) {
        return true;
    }
    const { item: id, minHours } = typeof after === "string" ? { item: after, minHours: 0 } : after;
    if (!isOver(id, items, state, ctx)) {
        return false;
    }
    const ended = state.items[id];
    return ended === undefined || ctx.now.getTime() - Date.parse(ended.at) >= minHours * 3_600_000;
}

/** The step shows by itself, not at an anchor that must be on screen. */
export function stepAnchor(step: OnboardingStep): OnboardingAnchor | undefined {
    return step.type === "popover" ? step.anchor : undefined;
}

export function isStepSkipped(step: OnboardingStep, used: readonly string[]): boolean {
    return step.skipIfUsed !== undefined && used.includes(step.skipIfUsed);
}

/**
 * Which items to record as skipped, and which one to start, if any. Pacing that does not depend on the state (one item
 * at a time) is the caller's job.
 */
export function decide(
    items: OnboardingItem[],
    state: OnboardingState,
    ctx: OnboardingContext,
): { skip: string[]; start?: OnboardingItem } {
    const skip: string[] = [];
    if (state.optedOut) {
        return { skip };
    }
    const quiet =
        state.lastAutoStartAt !== undefined &&
        ctx.now.getTime() - Date.parse(state.lastAutoStartAt) < ctx.quietPeriodMinutes * 60_000;
    const days = daysSinceFirstVisit(state, ctx.now);

    let start: OnboardingItem | undefined;
    for (const item of items) {
        const when = item.when ?? {};
        if (
            state.items[item.id] ||
            !inAudience(item, ctx) ||
            expired(item, ctx.now) ||
            days < (when.minDaysSinceFirstVisit ?? 0) ||
            days > (when.maxDaysSinceFirstVisit ?? Infinity) ||
            !afterSatisfied(item, items, state, ctx) ||
            (when.onAnchor !== undefined && !ctx.anchorVisible(when.onAnchor))
        ) {
            continue;
        }
        const firstStep = item.steps.find((step) => !isStepSkipped(step, state.used));
        // Every step is about something the user already used, or what the item teaches is already happening (someone
        // already in a bubble does not need the tutorial): record it without showing anything.
        if (!firstStep || (item.doneWhen && get(item.doneWhen))) {
            skip.push(item.id);
            continue;
        }
        // Only the first pending announcement shows: someone who missed three releases gets one "what's new".
        if (start?.kind === "announcement" && item.kind === "announcement") {
            skip.push(item.id);
            continue;
        }
        // A tip waits until the user has settled in. An announcement or the tutorial at entry interrupts nothing.
        if (start || quiet || (item.kind === "tour" && !ctx.startDelayOver)) {
            continue;
        }
        // An item that starts with a popover starts only when that target is on screen.
        const anchor = stepAnchor(firstStep);
        if (anchor === undefined || ctx.anchorVisible(anchor)) {
            start = item;
        }
    }
    return { skip, start };
}
