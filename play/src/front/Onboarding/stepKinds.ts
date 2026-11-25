import * as Phaser from "phaser";
import { get, writable } from "svelte/store";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../types/component";
import { LL } from "../../i18n/i18n-svelte";
import { showFloatingUi } from "../Utils/svelte-floatingui-show";
import { gameManager } from "../Phaser/Game/GameManager";
import type { GameScene } from "../Phaser/Game/GameScene";
import { hasMovedEventName } from "../Phaser/Player/Player";
import { silentStore } from "../Stores/MediaStore";
import OnboardingPopover from "../Components/Onboarding/OnboardingPopover.svelte";
import OnboardingModal from "../Components/Onboarding/OnboardingModal.svelte";
import MovementStepView from "../Components/Onboarding/Steps/MovementStep.svelte";
import type {
    ModalStep,
    MovementStep,
    OnboardingStep,
    PopoverStep,
    SimulatedConversationStep,
} from "./onboardingRules";
import type { ItemRun } from "./ItemRunner";
import { anchorNode, anchorsChanged, onAnchorClick } from "./OnboardingAnchors";
import { startSimulatedConversation } from "./SimulatedConversation";
import { renderMarkdown } from "./renderMarkdown";

/** Where the step stands among the steps that show. */
export interface StepView {
    position: number;
    total: number;
}

/** Shows a step and calls `run.complete()` when it is done. Returns its cleanup. */
export type StepKind<S> = (step: S, run: ItemRun, view: StepView) => () => void;

/** For a menu that opens: the next step's target gets this long to appear. */
const ANCHOR_WAIT_MS = 10_000;
/** The movement step completes once the avatar has stopped moving for this long. */
const MOVED_MS = 1000;
/** A re-render mounts the node again at once, while a menu that closes does not. */
const LOST_GRACE_MS = 300;
/** An attribute, not a class: Svelte rewrites the class of an element whose class depends on its state. */
const HIGHLIGHT_ATTRIBUTE = "data-onboarding-highlight";
/** The highlight glides from the previous target when that one went away less than this long ago. */
const GLIDE_WINDOW_MS = 2000;
const GLIDE_MS = 400;

// ponytail: shared by all items, so an item that starts within GLIDE_WINDOW_MS of another one's end glides from it too.
let lastHighlight: { rect: DOMRect; document: Document; at: number } | undefined;

/** What the current step shows over the game (a modal, a panel), rendered by `Onboarding.svelte`. */
export const onboardingView = writable<
    { component: WorkAdventureComponent; props: WorkAdventureComponentProps } | undefined
>(undefined);

function showView<P extends WorkAdventureComponentProps>(component: WorkAdventureComponent<P>, props: P): () => void {
    const view = { component, props };
    onboardingView.set(view);
    return () => onboardingView.update((current) => (current === view ? undefined : current));
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
                    image: step.image,
                    video: step.video,
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
        // Whatever `advance` says: the user did what the step points at.
        if (anchor === step.anchor) {
            run.complete();
        }
    });

    return () => {
        unsubscribe();
        offClick();
        clearTimeout(waitTimer);
        clearTimeout(lostTimer);
        detach();
    };
};

const modal: StepKind<ModalStep> = (step, run, view) => {
    const last = view.position === view.total;
    // A first modal that leads into other steps: an announcement that offers a tour, or the tutorial's welcome.
    const leadsIn = view.position === 1 && !last;
    const ll = get(LL).onboarding.tips;
    let stopped = false;
    let hide: (() => void) | undefined;
    Promise.resolve(step.text())
        .then((text) => {
            if (stopped) {
                return;
            }
            hide = showView(OnboardingModal, {
                title: step.title?.(),
                html: renderMarkdown(text),
                image: step.image,
                video: step.video,
                position: view.position,
                total: view.total,
                nextLabel: leadsIn ? ll.showMe() : last ? ll.gotIt() : ll.next(),
                notNowLabel: leadsIn ? ll.notNow() : undefined,
                onNext: run.complete,
                onClose: run.dismiss,
                onOptOut: run.optOut,
            });
        })
        .catch((error: unknown) => {
            console.error("The text of an onboarding modal did not load", error);
            // Like a target that never appeared: nothing is recorded, and the item comes back at the next visit.
            run.anchorMissing();
        });
    return () => {
        stopped = true;
        hide?.();
    };
};

/** A pulsing ring around the avatar, drawn in the game. */
function highlightAvatar(scene: GameScene): () => void {
    const graphics = scene.add.graphics();
    graphics.setDepth(10000);
    let time = 0;
    // After the update, so the ring does not lag one frame behind the avatar.
    const draw = () => {
        time += 0.05;
        const player = scene.CurrentPlayer;
        graphics.clear();
        graphics.lineStyle(4, 0xffff00, 0.6 + Math.sin(time) * 0.2);
        graphics.strokeCircle(player.x, player.y, 32 + Math.sin(time) * 5);
        scene.markDirty();
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, draw);
    draw();
    return () => {
        scene.events.off(Phaser.Scenes.Events.POST_UPDATE, draw);
        graphics.destroy();
    };
}

const movement: StepKind<MovementStep> = (_step, run) => {
    const scene = gameManager.getCurrentGameScene();
    const stopHighlight = highlightAvatar(scene);
    let movedTimer: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
        clearTimeout(movedTimer);
        movedTimer = setTimeout(run.complete, MOVED_MS);
    };
    scene.CurrentPlayer.on(hasMovedEventName, onMove);
    const closeView = showView(MovementStepView, { onnext: run.complete });
    return () => {
        closeView();
        clearTimeout(movedTimer);
        scene.CurrentPlayer.off(hasMovedEventName, onMove);
        stopHighlight();
    };
};

const simulatedConversation: StepKind<SimulatedConversationStep> = (step, run, view) => {
    // The fake user stays until the item ends.
    run.onEnd(startSimulatedConversation(gameManager.getCurrentGameScene()));
    // A silent zone would mute the demo.
    silentStore.setOnboardingOverride(true);
    run.onEnd(() => silentStore.setOnboardingOverride(false));
    // Below the fake user's video, once they have walked up and it plays.
    return popover({ ...step, type: "popover", anchor: "tutorial.simulatedUser" }, run, view);
};

export function startStep(step: OnboardingStep, run: ItemRun, view: StepView): () => void {
    switch (step.type) {
        case "modal":
            return modal(step, run, view);
        case "popover":
            return popover(step, run, view);
        case "movement":
            return movement(step, run, view);
        case "simulatedConversation":
            return simulatedConversation(step, run, view);
    }
}
