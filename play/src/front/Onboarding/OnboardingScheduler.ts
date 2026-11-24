import { get, writable } from "svelte/store";
import type { GameScene } from "../Phaser/Game/GameScene";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { localUserStore } from "../Connection/LocalUserStore";
import { touchScreenManager } from "../Touch/TouchScreenManager";
import { ONBOARDING_START_DELAY } from "../Enum/EnvironmentVariable";
import { onboardingStore } from "../Stores/OnboardingStore";
import { anchorNode, anchorsChanged, onAnchorClick } from "./OnboardingAnchors";
import { runItem } from "./ItemRunner";
import { decide, inAudience, newState, OnboardingState } from "./onboardingRules";
import type { OnboardingContext, OnboardingItem } from "./onboardingRules";

/** The player variable that holds the whole state, world scope, persisted. */
const STATE_KEY = "onboarding";
// ponytail: a constant until world configs exist (phase 3), whose `quietPeriodMinutes` sets it per world.
const QUIET_PERIOD_MINUTES = 60;
/** For what only time changes: the end of the quiet period, `after` delays, a new day. */
const TICK_MS = 60_000;

/** The scheduler of the current game scene, for the Help menu. */
export const onboardingScheduler = writable<OnboardingScheduler | undefined>(undefined);

/** Starts the item that applies, one at a time, and keeps the state. See DESIGN_onboarding.md. */
export class OnboardingScheduler {
    private current: { stop: () => void } | undefined;
    private ready = false;
    private readonly cleanups: (() => void)[] = [];

    constructor(
        private readonly scene: GameScene,
        private readonly items: OnboardingItem[],
    ) {
        // Written at once: the first visit is day 0, whatever happens next.
        this.writeState(this.readState());

        const startTimer = setTimeout(() => {
            this.ready = true;
            this.evaluate();
        }, ONBOARDING_START_DELAY * 1000);
        const tick = setInterval(() => this.evaluate(), TICK_MS);
        this.cleanups.push(
            () => clearTimeout(startTimer),
            () => clearInterval(tick),
            anchorsChanged.subscribe(() => this.evaluate()),
            onAnchorClick((anchor) =>
                this.updateState((state) => !state.used.includes(anchor) && state.used.push(anchor)),
            ),
            // ponytail: the tutorial still runs outside the scheduler; it becomes an item in phase 2.
            onboardingStore.subscribe(() => this.evaluate()),
        );
        for (const item of items) {
            if (item.audience?.allowed) {
                this.cleanups.push(item.audience.allowed.subscribe(() => this.evaluate()));
            }
        }
    }

    /** What the Help menu lists: every item this user is in the audience of, whatever its state. */
    get helpItems(): OnboardingItem[] {
        const ctx = this.context();
        return this.items.filter((item) => inAudience(item, ctx));
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
        if (!this.ready || this.current || get(onboardingStore) !== null) {
            return;
        }
        const ctx = this.context();
        const state = this.readState();
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
                analyticsClient.trackAdminEvent(
                    outcome === "done" ? "onboarding.item_done" : "onboarding.item_dismissed",
                    { itemId, source, step },
                );
            },
        });
    }

    private context(): OnboardingContext {
        return {
            now: new Date(),
            tags: this.scene.connection?.getAllTags() ?? [],
            isGuest: !localUserStore.isLogged(),
            isTouch: touchScreenManager.primaryTouchDevice,
            quietPeriodMinutes: QUIET_PERIOD_MINUTES,
            anchorVisible: (anchor) => anchorNode(anchor) !== undefined,
        };
    }

    /** A fresh copy each time: the variables manager ignores a write of the object it already holds. */
    private readState(): OnboardingState {
        const parsed = OnboardingState.safeParse(this.scene.getPlayerVariablesManager()?.variables.get(STATE_KEY));
        return parsed.success ? parsed.data : newState(new Date());
    }

    private writeState(state: OnboardingState): void {
        this.scene.getPlayerVariablesManager()?.setVariableFromApp(STATE_KEY, state, { persist: true, scope: "world" });
    }

    private updateState(change: (state: OnboardingState) => unknown): void {
        const state = this.readState();
        change(state);
        this.writeState(state);
    }
}
