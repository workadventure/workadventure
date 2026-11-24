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
/** The highlight glides from the previous target when that one went away less than this long ago. */
const GLIDE_WINDOW_MS = 2000;
const GLIDE_MS = 400;

// ponytail: shared by all items, so an item that starts within GLIDE_WINDOW_MS of another one's end glides from it too.
let lastHighlight: { rect: DOMRect; document: Document; at: number } | undefined;

export function renderMarkdown(text: string): string {
    return sanitizeHtml(marked.parse(text, { async: false }));
}

/** Moves a ring from `from` onto `node`, following the node if it moves meanwhile (a sidebar that slides in). */
function glide(win: Window, from: DOMRect, node: HTMLElement, onDone: () => void): () => void {
    const ring = win.document.createElement("div");
    ring.className = "onboarding-highlight-glide";
    ring.style.borderRadius = win.getComputedStyle(node).borderRadius;
    win.document.body.append(ring);
    const start = win.performance.now();
    let frame = 0;
    const move = (now: number) => {
        const t = Math.min(1, (now - start) / GLIDE_MS);
        const eased = 1 - (1 - t) ** 3;
        const to = node.getBoundingClientRect();
        const at = (a: number, b: number) => `${a + (b - a) * eased}px`;
        Object.assign(ring.style, {
            left: at(from.left, to.left),
            top: at(from.top, to.top),
            width: at(from.width, to.width),
            height: at(from.height, to.height),
        });
        if (t < 1) {
            frame = win.requestAnimationFrame(move);
        } else {
            ring.remove();
            onDone();
        }
    };
    move(start);
    return () => {
        win.cancelAnimationFrame(frame);
        ring.remove();
    };
}

const popover: StepKind<PopoverStep> = (step, run, view) => {
    let node: HTMLElement | undefined;
    let closePopover: (() => void) | undefined;
    let stopGlide: (() => void) | undefined;
    let shown = false;
    let lostTimer: ReturnType<typeof setTimeout> | undefined;

    const detach = () => {
        stopGlide?.();
        stopGlide = undefined;
        closePopover?.();
        closePopover = undefined;
        if (node?.isConnected) {
            lastHighlight = { rect: node.getBoundingClientRect(), document: node.ownerDocument, at: Date.now() };
        }
        node?.removeAttribute(HIGHLIGHT_ATTRIBUTE);
        node = undefined;
    };

    const highlight = (target: HTMLElement) => {
        const from = lastHighlight;
        lastHighlight = undefined;
        const win = target.ownerDocument.defaultView;
        if (
            !from ||
            !win ||
            from.document !== target.ownerDocument ||
            Date.now() - from.at > GLIDE_WINDOW_MS ||
            win.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            target.setAttribute(HIGHLIGHT_ATTRIBUTE, "");
            return;
        }
        stopGlide = glide(win, from.rect, target, () => {
            stopGlide = undefined;
            target.setAttribute(HIGHLIGHT_ATTRIBUTE, "");
        });
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
            highlight(target);
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
