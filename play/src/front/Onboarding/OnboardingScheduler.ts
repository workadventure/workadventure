import { writable } from "svelte/store";
import { DEFAULT_QUIET_PERIOD_MINUTES } from "@workadventure/messages";
import type { OnboardingAnchor } from "@workadventure/messages";
import type { GameScene } from "../Phaser/Game/GameScene";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { localUserStore } from "../Connection/LocalUserStore";
import { touchScreenManager } from "../Touch/TouchScreenManager";
import { ONBOARDING_START_DELAY } from "../Enum/EnvironmentVariable";
import { anchorNode, anchorsChanged, anchorUsed } from "./OnboardingAnchors";
import { runItem } from "./ItemRunner";
import { decide, inHelp, newState, OnboardingState, stepAnchor } from "./onboardingRules";
import type { OnboardingContext, OnboardingItem } from "./onboardingRules";

/**
 * An item of the Help menu. `missingAnchor`: its first target, when it is not on screen. `requested`: the user asked
 * to see it when that target shows up.
 */
export interface HelpItem {
    item: OnboardingItem;
    missingAnchor?: OnboardingAnchor;
    requested?: boolean;
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

/** The scheduler of the current game scene, for the Help menu. */
export const onboardingScheduler = writable<OnboardingScheduler | undefined>(undefined);

/** Starts the item that applies, one at a time, and keeps the state. See DESIGN_onboarding.md. */
export class OnboardingScheduler {
    private current: { stop: () => void } | undefined;
    private startDelayOver = false;
    private readonly cleanups: (() => void)[] = [];

    constructor(
        private readonly scene: GameScene,
        private readonly items: OnboardingItem[],
        /** The world's `quietPeriodMinutes`. */
        private readonly quietPeriodMinutes = DEFAULT_QUIET_PERIOD_MINUTES,
    ) {
        // Written at once: the first visit is day 0, whatever happens next.
        if (OnboardingState.safeParse(this.variables()?.get(STATE_KEY)).success) {
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
            this.writeState(state);
        }

        const startTimer = setTimeout(() => {
            this.startDelayOver = true;
            this.evaluate();
        }, ONBOARDING_START_DELAY * 1000);
        const tick = setInterval(() => this.evaluate(), TICK_MS);
        const used = anchorUsed.subscribe((anchor) =>
            this.updateState((state) => !state.used.includes(anchor) && state.used.push(anchor)),
        );
        this.cleanups.push(
            () => clearTimeout(startTimer),
            () => clearInterval(tick),
            anchorsChanged.subscribe(() => this.evaluate()),
            () => used.unsubscribe(),
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
        const requested = this.readState().requested ?? [];
        return this.items
            .filter((item) => inHelp(item, ctx))
            .map((item) => {
                const anchor = missingAnchor(item, ctx);
                return anchor ? { item, missingAnchor: anchor, requested: requested.includes(item.id) } : { item };
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

    /** Ignores pacing and the state: the user asked for it. */
    startFromHelp(id: string): void {
        const item = this.items.find((candidate) => candidate.id === id);
        if (!item) {
            return;
        }
        this.current?.stop();
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
        const { skip, start } = decide(this.items, state, ctx);
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
        const current = { stop: () => {} };
        this.current = current;
        current.stop = runItem(item, {
            // From the Help menu, the user asked for the whole item.
            used: () => (trigger === "help" ? [] : this.readState().used),
            onStart: (step) =>
                analyticsClient.trackAdminEvent("onboarding.item_started", { itemId, source, step, trigger }),
            onAnchorMissing: (anchor, step) =>
                analyticsClient.trackAdminEvent("onboarding.anchor_missing", { itemId, source, step, anchor }),
            onOptOut: () => this.updateState((state) => (state.optedOut = true)),
            onEnd: (outcome, step) => {
                if (this.current === current) {
                    this.current = undefined;
                }
                // An interruption records nothing, so the item can come back next session.
                if (outcome === "interrupted") {
                    return;
                }
                this.updateState((state) => (state.items[itemId] = { status: outcome, at: new Date().toISOString() }));
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
        const parsed = OnboardingState.safeParse(this.variables()?.get(STATE_KEY));
        const state = parsed.success ? parsed.data : newState(new Date());
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
