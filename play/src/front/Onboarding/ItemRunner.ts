import type { OnboardingAnchor } from "@workadventure/messages";
import { isStepSkipped, type OnboardingItem } from "./onboardingRules";
import { anchorNode } from "./OnboardingAnchors";
import { stepKinds } from "./stepKinds";

/** What a step kind can do to the item it belongs to. */
export interface ItemRun {
    /** This step is done: go to the next one. */
    complete: () => void;
    /** This step's target went away: go back to the latest earlier step whose target is on screen. */
    back: () => void;
    /** × or Esc. */
    dismiss: () => void;
    /** The target never appeared. */
    anchorMissing: () => void;
    /** "Stop showing tips". */
    optOut: () => void;
}

export type Outcome = "done" | "dismissed" | "interrupted";

export interface RunHooks {
    /** Anchors whose steps are left out (see `skipIfUsed`). Read as each step comes. */
    used(): readonly string[];
    onStart(step: number): void;
    onAnchorMissing(anchor: OnboardingAnchor, step: number): void;
    onOptOut(): void;
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
        hooks.onEnd(outcome, index);
    };

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
                    if (!isStepSkipped(earlier, used) && anchorNode(earlier.anchor)) {
                        show(j);
                        return;
                    }
                }
                // The bubble closed and took the lock button with it: nothing left to point at.
                finish("interrupted");
            }),
            dismiss: live(() => finish("dismissed")),
            anchorMissing: live(() => {
                hooks.onAnchorMissing(step.anchor, i);
                finish("interrupted");
            }),
            optOut: live(() => {
                hooks.onOptOut();
                finish("dismissed");
            }),
        };
        const position = shown.indexOf(step) + 1;
        stopStep = stepKinds[step.type](step, run, { position, total: shown.length });
    };

    show(0);
    return () => finish("interrupted");
}
