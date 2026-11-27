import { z } from "zod";
import { get, type Readable } from "svelte/store";
import type { AnalyticsEventName, BuiltinTourId, OnboardingAnchor } from "@workadventure/messages";

/**
 * Onboarding items and the rules that decide which one starts. Pure functions only, so they can be tested without
 * a game scene. See DESIGN_onboarding.md.
 */

/** A text read at display time, so it follows the current locale. */
export type Text = () => string;

/**
 * What a user can have used: an anchor (clicked, or a shortcut for it), or, for built-in items, an analytics event the
 * front sent (see `AnalyticsClient.eventNamesSent`). World items name anchors only: event names are no public contract.
 */
export type UsedKey = OnboardingAnchor | AnalyticsEventName;

interface StepBase {
    /** The step never shows to someone who already used this. */
    skipIfUsed?: UsedKey;
}

interface StepContent {
    title?: Text;
    text: Text;
    /** URLs. */
    image?: string;
    video?: string;
}

/** Centered. Next, or "Got it" on the last step; "Show me" and "Not now" when it leads into other steps. */
export interface ModalStep extends StepBase, Omit<StepContent, "text"> {
    type: "modal";
    /** Can load when the step shows: release notes are Markdown files. */
    text: () => string | Promise<string>;
}

export interface PopoverStep extends StepBase, StepContent {
    type: "popover";
    anchor: OnboardingAnchor;
    side?: "top" | "right" | "bottom" | "left";
    /** A click on the anchor always completes the step. "next" also shows a Next button, "click" does not. */
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
    /** false: a draft, which never starts by itself and only shows in the Help menu, to users with the admin tag. */
    published?: boolean;
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
    /**
     * Built-in items only: the item is skipped, without using up the quiet period, once the user used any of these;
     * used while it shows, it ends as done.
     */
    skipIfUsed?: UsedKey[];
    steps: OnboardingStep[];
}

/** A built-in item. A tour's id is typed: a tip missing from `BuiltinTourId` (in libs/messages) does not compile. */
export type BuiltinOnboardingItem =
    | (OnboardingItem & { kind: "tour"; id: BuiltinTourId })
    | (OnboardingItem & { kind: "tutorial" | "announcement" });

export const OnboardingState = z.object({
    /** Local date, YYYY-MM-DD. */
    firstVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    optedOut: z.literal(true).optional(),
    lastAutoStartAt: z.string().optional(),
    /** `at` is when the item ended, for `after`. */
    items: z.record(z.object({ status: z.enum(["done", "dismissed", "skipped"]), at: z.string() })),
    /** Anchors clicked at least once. Plain strings, so a removed anchor does not invalidate the state. */
    used: z.array(z.string()),
    /** Items asked for in the Help menu while their first anchor was not on screen: each starts when it shows up. */
    requested: z.array(z.string()).optional(),
    /** How many times a tip that started by itself was interrupted. At 2, it goes after every other item. */
    interrupted: z.record(z.number().int().min(1)).optional(),
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

/** In the Help menu: the items of the user's audience, and every draft for a world admin, who previews them. */
export function inHelp(item: OnboardingItem, ctx: OnboardingContext): boolean {
    return item.published === false ? ctx.tags.includes("admin") : inAudience(item, ctx);
}

function expired(item: OnboardingItem, now: Date): boolean {
    return item.when?.expiresAt !== undefined && now.getTime() >= Date.parse(item.when.expiresAt);
}

/** The group of an item: the second segment of a built-in id (`wa.<group>.<name>`), "world" for a world item. */
export function idGroup(id: string): string {
    return id.startsWith("wa.") ? id.split(".")[1] : "world";
}

/**
 * An item that can never show to this user does not hold back the items that come `after` it. Nor does a tour once the
 * user stopped the tips: it will not start by itself, and the world's announcement after it still shows.
 */
function isOver(id: string, items: OnboardingItem[], state: OnboardingState, ctx: OnboardingContext): boolean {
    if (state.items[id]) {
        return true;
    }
    const item = items.find((candidate) => candidate.id === id);
    return (
        item === undefined ||
        item.published === false ||
        !inAudience(item, ctx) ||
        expired(item, ctx.now) ||
        (state.optedOut === true && item.kind === "tour")
    );
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

/** Why an item starts or does not, for the `onboarding` debug log. */
export type Reason =
    | "seen"
    | "optedOut"
    | "unpublished"
    | "notInAudience"
    | "expired"
    | "tooEarly"
    | "tooLate"
    | "waitingForAfter"
    | "onAnchorNotOnScreen"
    | "used"
    | "doneAlready"
    | "laterAnnouncement"
    | "anotherItemStarts"
    | "demoted"
    | "quietPeriod"
    | "startDelay"
    | "firstAnchorNotOnScreen"
    | "starts";

/** Every key the items name in `skipIfUsed`, on the item or on a step: the only event names worth storing. */
export function referencedKeys(items: OnboardingItem[]): Set<string> {
    const keys = new Set<string>();
    for (const item of items) {
        for (const key of item.skipIfUsed ?? []) {
            keys.add(key);
        }
        for (const step of item.steps) {
            if (step.skipIfUsed !== undefined) {
                keys.add(step.skipIfUsed);
            }
        }
    }
    return keys;
}

/**
 * Which items to record as skipped, which one to start, if any, and why for each item. Pacing that does not depend on
 * the state (one item at a time) is the caller's job.
 */
export function decide(
    items: OnboardingItem[],
    state: OnboardingState,
    ctx: OnboardingContext,
): { skip: string[]; start?: OnboardingItem; reasons: Record<string, Reason> } {
    const skip: string[] = [];
    const reasons: Record<string, Reason> = {};
    const quiet =
        state.lastAutoStartAt !== undefined &&
        ctx.now.getTime() - Date.parse(state.lastAutoStartAt) < ctx.quietPeriodMinutes * 60_000;
    const days = daysSinceFirstVisit(state, ctx.now);
    const demoted = (item: OnboardingItem) => (state.interrupted?.[item.id] ?? 0) >= 2;
    let start: OnboardingItem | undefined;

    // Typed to return a `Reason`, so every way out of it gives one. Checks in this order.
    const decideItem = (item: OnboardingItem): Reason => {
        const when = item.when ?? {};
        if (state.items[item.id]) {
            return "seen";
        }
        // "Stop showing tips" stops tips only: announcements and the tutorial still start. A tip is passed over before
        // any check that records a skip, so nothing is recorded for it.
        if (state.optedOut && item.kind === "tour") {
            return "optedOut";
        }
        if (item.published === false) {
            return "unpublished";
        }
        if (!inAudience(item, ctx)) {
            return "notInAudience";
        }
        if (expired(item, ctx.now)) {
            return "expired";
        }
        if (days < (when.minDaysSinceFirstVisit ?? 0)) {
            return "tooEarly";
        }
        if (days > (when.maxDaysSinceFirstVisit ?? Infinity)) {
            return "tooLate";
        }
        if (!afterSatisfied(item, items, state, ctx)) {
            return "waitingForAfter";
        }
        if (when.onAnchor !== undefined && !ctx.anchorVisible(when.onAnchor)) {
            return "onAnchorNotOnScreen";
        }
        // Every step is about something the user already used, or the item is: record it without showing anything.
        const firstStep = item.steps.find((step) => !isStepSkipped(step, state.used));
        if (!firstStep || item.skipIfUsed?.some((key) => state.used.includes(key))) {
            skip.push(item.id);
            return "used";
        }
        // What the item teaches is already happening (someone already in a bubble does not need the tutorial).
        if (item.doneWhen && get(item.doneWhen)) {
            skip.push(item.id);
            return "doneAlready";
        }
        // Only the first pending announcement shows: someone who missed three releases gets one "what's new".
        if (start?.kind === "announcement" && item.kind === "announcement") {
            skip.push(item.id);
            return "laterAnnouncement";
        }
        if (start) {
            return demoted(item) ? "demoted" : "anotherItemStarts";
        }
        if (quiet) {
            return "quietPeriod";
        }
        // A tip waits until the user has settled in. An announcement or the tutorial at entry interrupts nothing.
        if (item.kind === "tour" && !ctx.startDelayOver) {
            return "startDelay";
        }
        // An item that starts with a popover starts only when that target is on screen.
        const anchor = stepAnchor(firstStep);
        if (anchor !== undefined && !ctx.anchorVisible(anchor)) {
            return "firstAnchorNotOnScreen";
        }
        start = item;
        return "starts";
    };

    // A tip interrupted twice (its bubble closed, the scene changed) goes after every other item: it no longer blocks
    // the queue, and still shows when nothing else is waiting.
    for (const item of [...items.filter((item) => !demoted(item)), ...items.filter(demoted)]) {
        reasons[item.id] = decideItem(item);
    }
    return { skip, start, reasons };
}
