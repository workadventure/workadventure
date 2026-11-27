import { z } from "zod";
import { get, type Readable } from "svelte/store";
import type { OnboardingAnchor } from "@workadventure/messages";

/**
 * Onboarding items and the rules that decide which one starts. Pure functions only, so they can be tested without
 * a game scene. See DESIGN_onboarding.md.
 */

/** A text read at display time, so it follows the current locale. */
export type Text = () => string;

export interface PopoverStep {
    type: "popover";
    anchor: OnboardingAnchor;
    side?: "top" | "right" | "bottom" | "left";
    /** "next": a Next button. "click": the user clicks the anchor itself. */
    advance?: "next" | "click";
    title?: Text;
    text: Text;
    /** The step never shows to someone who already clicked this anchor. */
    skipIfUsed?: OnboardingAnchor;
}

export type OnboardingStep = PopoverStep;

export interface OnboardingItem {
    /** Unique and stable: the state is keyed by it. Built-in ids start with "wa.". */
    id: string;
    kind: "tour";
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

export function isStepSkipped(step: OnboardingStep, used: readonly string[]): boolean {
    return step.skipIfUsed !== undefined && used.includes(step.skipIfUsed);
}

/**
 * Which items to record as skipped, and which one to start, if any. Pacing that does not depend on the state (one item
 * at a time, the start delay) is the caller's job.
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
        if (!firstStep) {
            // Every step is about something the user already used: record it without showing anything.
            skip.push(item.id);
            continue;
        }
        if (start || quiet) {
            continue;
        }
        // A tour starts only when its first target is on screen.
        if (ctx.anchorVisible(firstStep.anchor)) {
            start = item;
        }
    }
    return { skip, start };
}
