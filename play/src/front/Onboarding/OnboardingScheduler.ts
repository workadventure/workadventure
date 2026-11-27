import { derived, writable } from "svelte/store";
import type { Writable } from "svelte/store";
import Debug from "debug";
import { DEFAULT_QUIET_PERIOD_MINUTES, OnboardingTipGroup } from "@workadventure/messages";
import type { OnboardingAnchor } from "@workadventure/messages";
import type { GameScene } from "../Phaser/Game/GameScene";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { localUserStore } from "../Connection/LocalUserStore";
import { touchScreenManager } from "../Touch/TouchScreenManager";
import { ONBOARDING_START_DELAY } from "../Enum/EnvironmentVariable";
import { anchorNode, anchorsChanged, anchorUsed } from "./OnboardingAnchors";
import { runItem } from "./ItemRunner";
import { decide, idGroup, inHelp, newState, OnboardingState, referencedKeys, stepAnchor } from "./onboardingRules";
import type { OnboardingContext, OnboardingItem } from "./onboardingRules";

/** A group of the Help menu: the world's own items, or a group of built-in items. */
export type HelpGroup = OnboardingTipGroup | "world";

/** In the order the Help menu shows them. */
const HELP_GROUPS: HelpGroup[] = ["world", ...OnboardingTipGroup.options.map((option) => option.value)];

/**
 * An item of the Help menu. `missingAnchor`: its first target, when it is not on screen. `requested`: the user asked
 * to see it when that target shows up. `seen`: the state has an entry for it (done, dismissed or skipped).
 */
export interface HelpItem {
    item: OnboardingItem;
    group: HelpGroup;
    seen: boolean;
    missingAnchor?: OnboardingAnchor;
    requested?: boolean;
}

/**
 * The Help menu's groups, without the empty ones: the world's own items first, then the groups of built-in items in
 * their order. Within a group, the items not seen yet come first, each part in priority order.
 */
export function groupHelpItems(items: HelpItem[]): { group: HelpGroup; items: HelpItem[] }[] {
    return HELP_GROUPS.map((group) => ({
        group,
        // A stable sort: the priority order stays within the unseen and the seen items.
        items: items.filter((item) => item.group === group).sort((a, b) => Number(a.seen) - Number(b.seen)),
    })).filter((group) => group.items.length > 0);
}

/** The group of an item; "world" for a world item, and for a built-in group this release does not list. */
function helpGroup(id: string): HelpGroup {
    const group = idGroup(id);
    return HELP_GROUPS.find((known) => known === group) ?? "world";
}

/** The first anchor of an item, when it is not on screen: the item cannot start now. */
function missingAnchor(item: OnboardingItem, ctx: OnboardingContext): OnboardingAnchor | undefined {
    const anchor = item.steps[0] && stepAnchor(item.steps[0]);
    return anchor && !ctx.anchorVisible(anchor) ? anchor : undefined;
}

/** The player variable that holds the whole state, world scope, persisted. */
const STATE_KEY = "onboarding";
/** The player variable of the tutorial before onboarding items, which map scripts read (`WA.player.state`). */
const TUTORIAL_DONE_KEY = "tutorialDone";
/** For what only time changes: the end of the quiet period, `after` delays, a new day. */
const TICK_MS = 60_000;

/** `localStorage.debug = "onboarding"`: why each item starts or not, each time that changes. */
const debug = Debug("onboarding");

/** The scheduler of the current game scene, for the Help menu. */
export const onboardingScheduler = writable<OnboardingScheduler | undefined>(undefined);

/** Starts the item that applies, one at a time, and keeps the state. See DESIGN_onboarding.md. */
export class OnboardingScheduler {
    /** The running item. `usedNow` turns true when a key of its item-level `skipIfUsed` is used while it shows. */
    private current: { stop: () => void; skipIfUsed?: readonly string[]; usedNow?: Writable<boolean> } | undefined;
    private startDelayOver = false;
    /** Set while the Help menu stops the running item to start another one: that interruption is not counted. */
    private stoppingForHelp = false;
    /** The reasons last logged, so that the debug log only shows a change. */
    private lastReasons = "";
    private readonly cleanups: (() => void)[] = [];
    /** Set when the stored state cannot be read: the state of this session, which is never written. */
    private memoryState: OnboardingState | undefined;

    constructor(
        private readonly scene: GameScene,
        private readonly items: OnboardingItem[],
        /** The world's `quietPeriodMinutes`. */
        private readonly quietPeriodMinutes = DEFAULT_QUIET_PERIOD_MINUTES,
    ) {
        // Written at once: the first visit is day 0, whatever happens next.
        const stored = this.variables()?.get(STATE_KEY);
        if (OnboardingState.safeParse(stored).success) {
            this.writeState(this.readState());
        } else {
            const state = newState(new Date());
            // A new user does not need "what's new". Someone who did the tutorial is an existing user. A draft is not
            // news yet: it will be when the world publishes it.
            if (!this.tutorialDone()) {
                const at = new Date().toISOString();
                for (const item of items) {
                    if (item.kind === "announcement" && item.published !== false) {
                        state.items[item.id] = { status: "skipped", at };
                    }
                }
            }
            if (stored !== undefined) {
                // Most likely written by a newer front, in another tab or before a rollback: overwriting it would
                // reset the first visit and show every item again. This session works on a fresh state in memory.
                console.warn("The onboarding state of this world cannot be read: it is left as it is.", stored);
                this.memoryState = state;
            }
            this.writeState(state);
        }

        const startTimer = setTimeout(() => {
            this.startDelayOver = true;
            this.evaluate();
        }, ONBOARDING_START_DELAY * 1000);
        const tick = setInterval(() => this.evaluate(), TICK_MS);
        // After the first write: the analytics subject replays the names sent so far at once.
        const referenced = referencedKeys(items);
        const used = anchorUsed.subscribe((anchor) => this.markUsed(anchor));
        // Only the event names an item names: `used` does not become a record of everything the user does.
        const sent = analyticsClient.eventNamesSent.subscribe((name) => referenced.has(name) && this.markUsed(name));
        this.cleanups.push(
            () => clearTimeout(startTimer),
            () => clearInterval(tick),
            anchorsChanged.subscribe(() => this.evaluate()),
            () => used.unsubscribe(),
            () => sent.unsubscribe(),
        );
        for (const item of items) {
            if (item.audience?.allowed) {
                this.cleanups.push(item.audience.allowed.subscribe(() => this.evaluate()));
            }
        }
        // The tutorial and announcements start right away.
        this.evaluate();
    }

    /**
     * What the Help menu lists: every item this user is in the audience of, whatever its state, and the drafts for a
     * world admin. An item whose first target is not on screen cannot start now (the tip on the lock button, outside a
     * bubble): the menu shows it greyed out, with where that target shows up, and the user can ask to see it then.
     */
    get helpItems(): HelpItem[] {
        const ctx = this.context();
        const state = this.readState();
        const requested = state.requested ?? [];
        return this.items
            .filter((item) => inHelp(item, ctx))
            .map((item) => {
                const listed = { item, group: helpGroup(item.id), seen: state.items[item.id] !== undefined };
                const anchor = missingAnchor(item, ctx);
                return anchor ? { ...listed, missingAnchor: anchor, requested: requested.includes(item.id) } : listed;
            });
    }

    /** From the Help menu: the item starts when its first target shows up. Again to cancel. */
    toggleRequest(id: string): void {
        this.updateState((state) => {
            const requested = state.requested ?? [];
            const next = requested.includes(id) ? requested.filter((other) => other !== id) : [...requested, id];
            state.requested = next.length > 0 ? next : undefined;
        });
        this.evaluate();
    }

    /** False once the user clicked "Stop showing tips": no tip starts by itself any more. Announcements still do. */
    get showTips(): boolean {
        return !this.readState().optedOut;
    }

    /** From the Help menu, to undo "Stop showing tips" (tips start by themselves again), or to do the same. */
    setShowTips(show: boolean): void {
        if (!show && this.showTips) {
            analyticsClient.trackAdminEvent("onboarding.opted_out", { from: "help" });
        }
        this.updateState((state) => {
            if (show) {
                delete state.optedOut;
            } else {
                state.optedOut = true;
            }
        });
        this.evaluate();
    }

    /** Ignores pacing and the state: the user asked for it. */
    startFromHelp(id: string): void {
        const item = this.items.find((candidate) => candidate.id === id);
        if (!item) {
            return;
        }
        this.stoppingForHelp = true;
        this.current?.stop();
        this.stoppingForHelp = false;
        this.run(item, "help");
    }

    destroy(): void {
        this.current?.stop();
        for (const cleanup of this.cleanups) {
            cleanup();
        }
    }

    private evaluate(): void {
        if (this.current) {
            return;
        }
        const ctx = this.context();
        const state = this.readState();
        // Asked for in the Help menu: it starts as soon as it can, whatever pacing and the state say.
        const requested = this.items.find(
            (item) => state.requested?.includes(item.id) && inHelp(item, ctx) && !missingAnchor(item, ctx),
        );
        if (requested) {
            const others = state.requested?.filter((id) => id !== requested.id) ?? [];
            state.requested = others.length > 0 ? others : undefined;
            this.writeState(state);
            this.run(requested, "help");
            return;
        }
        const { skip, start, reasons } = decide(this.items, state, ctx);
        if (debug.enabled) {
            const lines = Object.entries(reasons)
                .map(([id, reason]) => `${id}: ${reason}`)
                .join("\n");
            if (lines !== this.lastReasons) {
                this.lastReasons = lines;
                debug("Why each item starts or not:\n%s", lines);
            }
        }
        const at = ctx.now.toISOString();
        for (const id of skip) {
            state.items[id] = { status: "skipped", at };
        }
        if (start) {
            state.lastAutoStartAt = at;
        }
        if (skip.length > 0 || start) {
            this.writeState(state);
        }
        if (start) {
            this.run(start, "auto");
        } else if (skip.length > 0) {
            // A skipped item can unblock the items that come `after` it.
            this.evaluate();
        }
    }

    private run(item: OnboardingItem, trigger: "auto" | "help"): void {
        const itemId = item.id;
        const source = itemId.startsWith("wa.") ? "builtin" : "world";
        const usedNow = item.skipIfUsed?.length ? writable(false) : undefined;
        const current = { stop: () => {}, skipIfUsed: item.skipIfUsed, usedNow };
        this.current = current;
        // The runner ends an item as done when `doneWhen` turns true: a tip ends once the user does what it is about.
        const doneWhen = usedNow && (item.doneWhen ? derived([item.doneWhen, usedNow], ([a, b]) => a || b) : usedNow);
        current.stop = runItem(doneWhen ? { ...item, doneWhen } : item, {
            // From the Help menu, the user asked for the whole item.
            used: () => (trigger === "help" ? [] : this.readState().used),
            onStart: (step) =>
                analyticsClient.trackAdminEvent("onboarding.item_started", { itemId, source, step, trigger }),
            onAnchorMissing: (anchor, step) =>
                analyticsClient.trackAdminEvent("onboarding.anchor_missing", { itemId, source, step, anchor }),
            onOptOut: (step) => {
                this.updateState((state) => (state.optedOut = true));
                analyticsClient.trackAdminEvent("onboarding.opted_out", { from: "tip", itemId, source, step });
            },
            onEnd: (outcome, step) => {
                if (this.current === current) {
                    this.current = undefined;
                }
                // An interruption records nothing, so the item can come back next session. A tip that started by itself
                // is counted, unless the Help menu stopped it to start another item: interrupted twice, it goes after
                // every other item (see `decide()`).
                if (outcome === "interrupted") {
                    if (item.kind === "tour" && trigger === "auto" && !this.stoppingForHelp) {
                        this.updateState((state) => {
                            state.interrupted = {
                                ...state.interrupted,
                                [itemId]: (state.interrupted?.[itemId] ?? 0) + 1,
                            };
                        });
                    }
                    return;
                }
                this.updateState((state) => {
                    state.items[itemId] = { status: outcome, at: new Date().toISOString() };
                    if (state.interrupted?.[itemId] !== undefined) {
                        const others = Object.entries(state.interrupted).filter(([id]) => id !== itemId);
                        state.interrupted = others.length > 0 ? Object.fromEntries(others) : undefined;
                    }
                });
                // A plain condition: the catalog test reads the two event names off this ternary.
                const done = outcome === "done";
                analyticsClient.trackAdminEvent(done ? "onboarding.item_done" : "onboarding.item_dismissed", {
                    itemId,
                    source,
                    step,
                });
            },
        });
    }

    /** A use of an anchor or of a feature `skipIfUsed` names: recorded, and it ends a running tip about it. */
    private markUsed(key: string): void {
        this.updateState((state) => !state.used.includes(key) && state.used.push(key));
        if (this.current?.skipIfUsed?.includes(key)) {
            this.current.usedNow?.set(true);
        }
    }

    private context(): OnboardingContext {
        return {
            now: new Date(),
            tags: this.scene.connection?.getAllTags() ?? [],
            isGuest: !localUserStore.isLogged(),
            isTouch: touchScreenManager.primaryTouchDevice,
            quietPeriodMinutes: this.quietPeriodMinutes,
            startDelayOver: this.startDelayOver,
            anchorVisible: (anchor) => anchorNode(anchor) !== undefined,
        };
    }

    private variables(): Map<string, unknown> | undefined {
        return this.scene.getPlayerVariablesManager()?.variables;
    }

    private tutorialDone(): boolean {
        const value = this.variables()?.get(TUTORIAL_DONE_KEY);
        return value === true || value === "true";
    }

    /** A fresh copy each time: the variables manager ignores a write of the object it already holds. */
    private readState(): OnboardingState {
        let state: OnboardingState;
        if (this.memoryState) {
            state = structuredClone(this.memoryState);
        } else {
            const parsed = OnboardingState.safeParse(this.variables()?.get(STATE_KEY));
            state = parsed.success ? parsed.data : newState(new Date());
        }
        // The tutorial done before onboarding items, or a script that turns it off by setting `tutorialDone`.
        if (this.tutorialDone()) {
            for (const item of this.items) {
                if (item.kind === "tutorial" && !state.items[item.id]) {
                    state.items[item.id] = { status: "done", at: new Date(0).toISOString() };
                }
            }
        }
        return state;
    }

    private writeState(state: OnboardingState): void {
        // Kept here, so the skips `evaluate()` records are seen by its next call, which then returns.
        if (this.memoryState) {
            this.memoryState = state;
            return;
        }
        const manager = this.scene.getPlayerVariablesManager();
        manager?.setVariableFromApp(STATE_KEY, state, { persist: true, scope: "world" });
        // Map scripts read `tutorialDone`, and the other tutorial (touch or not) is over too.
        if (!this.tutorialDone() && this.items.some((item) => item.kind === "tutorial" && state.items[item.id])) {
            manager?.setVariableFromApp(TUTORIAL_DONE_KEY, true, { persist: true, scope: "world" });
        }
    }

    private updateState(change: (state: OnboardingState) => unknown): void {
        const state = this.readState();
        change(state);
        this.writeState(state);
    }
}
