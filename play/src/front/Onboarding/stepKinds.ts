import { marked } from "marked";
import { showFloatingUi } from "../Utils/svelte-floatingui-show";
import { sanitizeHtml } from "../Utils/HtmlSanitizer";
import OnboardingPopover from "../Components/Onboarding/OnboardingPopover.svelte";
import type { OnboardingStep, PopoverStep } from "./onboardingRules";
import type { ItemRun } from "./ItemRunner";
import { anchorNode, anchorsChanged, onAnchorClick } from "./OnboardingAnchors";

/** Where the step stands among the steps that show. */
export interface StepView {
    position: number;
    total: number;
}

/** Shows a step and calls `run.complete()` when it is done. Returns its cleanup. */
export type StepKind<S> = (step: S, run: ItemRun, view: StepView) => () => void;

/** For a menu that opens: the next step's target gets this long to appear. */
const ANCHOR_WAIT_MS = 10_000;
/** A re-render mounts the node again at once, while a menu that closes does not. */
const LOST_GRACE_MS = 300;
/** An attribute, not a class: Svelte rewrites the class of an element whose class depends on its state. */
const HIGHLIGHT_ATTRIBUTE = "data-onboarding-highlight";

export function renderMarkdown(text: string): string {
    return sanitizeHtml(marked.parse(text, { async: false }));
}

const popover: StepKind<PopoverStep> = (step, run, view) => {
    let node: HTMLElement | undefined;
    let closePopover: (() => void) | undefined;
    let shown = false;
    let lostTimer: ReturnType<typeof setTimeout> | undefined;

    const detach = () => {
        closePopover?.();
        closePopover = undefined;
        node?.removeAttribute(HIGHLIGHT_ATTRIBUTE);
        node = undefined;
    };

    const update = () => {
        const target = anchorNode(step.anchor);
        if (target === node) {
            return;
        }
        detach();
        if (target) {
            clearTimeout(lostTimer);
            lostTimer = undefined;
            shown = true;
            node = target;
            node.setAttribute(HIGHLIGHT_ATTRIBUTE, "");
            closePopover = showFloatingUi(
                target,
                OnboardingPopover,
                {
                    title: step.title?.(),
                    html: renderMarkdown(step.text()),
                    position: view.position,
                    total: view.total,
                    showNext: step.advance !== "click",
                    onNext: run.complete,
                    onClose: run.dismiss,
                    onOptOut: run.optOut,
                },
                { placement: step.side ?? "bottom" },
                12,
            );
        } else if (shown && lostTimer === undefined) {
            lostTimer = setTimeout(() => {
                lostTimer = undefined;
                if (!anchorNode(step.anchor)) {
                    run.back();
                }
            }, LOST_GRACE_MS);
        }
    };

    const waitTimer = setTimeout(() => {
        if (!shown) {
            run.anchorMissing();
        }
    }, ANCHOR_WAIT_MS);
    const unsubscribe = anchorsChanged.subscribe(update);
    const offClick = onAnchorClick((anchor) => {
        if (anchor === step.anchor && step.advance === "click") {
            run.complete();
        }
    });
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            run.dismiss();
        }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
        unsubscribe();
        offClick();
        window.removeEventListener("keydown", onKeyDown);
        clearTimeout(waitTimer);
        clearTimeout(lostTimer);
        detach();
    };
};

export const stepKinds: { [K in OnboardingStep["type"]]: StepKind<Extract<OnboardingStep, { type: K }>> } = {
    popover,
};
