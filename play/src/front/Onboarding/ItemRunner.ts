import type { OnboardingAnchor } from "@workadventure/messages";
import { isStepSkipped, stepAnchor, type OnboardingItem } from "./onboardingRules";
import { anchorNode } from "./OnboardingAnchors";
import { startStep } from "./stepKinds";

/** What a step kind can do to the item it belongs to. */
export interface ItemRun {
    /** This step is done: go to the next one. */
    complete: () => void;
    /** This step's target went away: go back to the latest earlier step whose target is on screen. */
    back: () => void;
    /** × or "Not now". */
    dismiss: () => void;
    /** The target never appeared. */
    anchorMissing: () => void;
    /** "Stop showing tips". Tips only: an announcement or the tutorial does not offer it. */
    optOut?: () => void;
    /** Runs however the item ends, for what outlives the step (the tutorial's fake user). */
    onEnd: (cleanup: () => void) => void;
}

export type Outcome = "done" | "dismissed" | "interrupted";

export interface RunHooks {
    /** Anchors whose steps are left out (see `skipIfUsed`). Read as each step comes. */
    used(): readonly string[];
    onStart(step: number): void;
    onAnchorMissing(anchor: OnboardingAnchor, step: number): void;
    /** "Stop showing tips", on `step`. */
    onOptOut(step: number): void;
    onEnd(outcome: Outcome, step: number): void;
}

/** Runs the steps of an item one after the other. Returns a function that interrupts it. */
export function runItem(item: OnboardingItem, hooks: RunHooks): () => void {
    let index = 0;
    // Bumped at each step change, so a late call from a step that is gone does nothing.
    let token = 0;
    let stopStep: (() => void) | undefined;
    let started = false;
    let ended = false;
    const endCleanups: (() => void)[] = [];

    const leaveStep = () => {
        token++;
        stopStep?.();
        stopStep = undefined;
    };

    const finish = (outcome: Outcome) => {
        if (ended) {
            return;
        }
        ended = true;
        leaveStep();
        window.removeEventListener("keydown", onKeyDown);
        for (const cleanup of endCleanups.splice(0)) {
            cleanup();
        }
        hooks.onEnd(outcome, index);
    };

    // Whatever the step shows.
    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            finish("dismissed");
        }
    }

    const show = (from: number) => {
        leaveStep();
        const used = hooks.used();
        const shown = item.steps.filter((step) => !isStepSkipped(step, used));
        const i = item.steps.findIndex((step, n) => n >= from && !isStepSkipped(step, used));
        if (i === -1) {
            finish("done");
            return;
        }
        index = i;
        const step = item.steps[i];
        if (!started) {
            started = true;
            hooks.onStart(i);
        }

        const myToken = token;
        const live = (action: () => void) => () => {
            if (myToken === token && !ended) {
                action();
            }
        };
        const run: ItemRun = {
            complete: live(() => show(i + 1)),
            back: live(() => {
                for (let j = i - 1; j >= 0; j--) {
                    const earlier = item.steps[j];
                    const anchor = stepAnchor(earlier);
                    if (!isStepSkipped(earlier, used) && anchor && anchorNode(anchor)) {
                        show(j);
                        return;
                    }
                }
                // The bubble closed and took the lock button with it: nothing left to point at.
                finish("interrupted");
            }),
            dismiss: live(() => finish("dismissed")),
            anchorMissing: live(() => {
                const anchor = stepAnchor(step);
                if (anchor) {
                    hooks.onAnchorMissing(anchor, i);
                }
                finish("interrupted");
            }),
            optOut:
                item.kind === "tour"
                    ? live(() => {
                          hooks.onOptOut(i);
                          finish("dismissed");
                      })
                    : undefined,
            onEnd: (cleanup) => {
                if (ended) {
                    cleanup();
                } else {
                    endCleanups.push(cleanup);
                }
            },
        };
        const position = shown.indexOf(step) + 1;
        stopStep = startStep(step, run, { position, total: shown.length });
    };

    window.addEventListener("keydown", onKeyDown);
    show(0);
    const unsubscribeDone = item.doneWhen?.subscribe((done) => {
        if (done) {
            finish("done");
        }
    });
    if (unsubscribeDone) {
        if (ended) {
            unsubscribeDone();
        } else {
            endCleanups.push(unsubscribeDone);
        }
    }
    return () => finish("interrupted");
}
