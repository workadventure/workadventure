import type { Attachment } from "svelte/attachments";
import { get, writable } from "svelte/store";
import type { OnboardingAnchor } from "@workadventure/messages";
import { LL } from "../../i18n/i18n-svelte";

/** The visible nodes of each anchor. A node that is mounted but clipped or hidden is not in here. */
const visibleNodes = new Map<OnboardingAnchor, Set<HTMLElement>>();
const clickListeners = new Set<(anchor: OnboardingAnchor) => void>();
const usedListeners = new Set<(anchor: OnboardingAnchor) => void>();

/** Ticks each time an anchor appears or goes away. Read the nodes with `anchorNode()`. */
export const anchorsChanged = writable(0);

/** A visible node of this anchor, if any. One anchor can have several (the bar and the "more" menu). */
export function anchorNode(anchor: OnboardingAnchor): HTMLElement | undefined {
    for (const node of visibleNodes.get(anchor) ?? []) {
        if (node.isConnected) {
            return node;
        }
    }
    return undefined;
}

/** Where an anchor shows up, for an item of the Help menu that cannot start because its anchor is not on screen. */
export function anchorPlace(anchor: OnboardingAnchor): string {
    const ll = get(LL).onboarding.help;
    switch (anchor) {
        case "actionBar.lockBubble":
        case "actionBar.screenShare":
        case "actionBar.pictureInPicture":
            return ll.inConversation();
        case "mapEditor.tool.area":
        case "mapEditor.tool.entity":
        case "mapEditor.tool.exploration":
        case "mapEditor.entityList":
            return ll.inMapEditor();
        default:
            return ll.notHere();
    }
}

/** Called on every click on an anchor, before the element's own handlers. */
export function onAnchorClick(listener: (anchor: OnboardingAnchor) => void): () => void {
    clickListeners.add(listener);
    return () => clickListeners.delete(listener);
}

/** Called on every use of an anchor: a click on it, or a `markUsed()`. */
export function onAnchorUsed(listener: (anchor: OnboardingAnchor) => void): () => void {
    usedListeners.add(listener);
    return () => usedListeners.delete(listener);
}

/**
 * For a feature used without a click on its anchor (a keyboard shortcut): `skipIfUsed` then knows the user used it.
 * Unlike a click, it does not complete a step that points at the anchor.
 */
export function markUsed(anchor: OnboardingAnchor): void {
    for (const listener of [...usedListeners]) {
        listener(anchor);
    }
}

function setVisible(anchor: OnboardingAnchor, node: HTMLElement, visible: boolean): void {
    let nodes = visibleNodes.get(anchor);
    if (visible === (nodes?.has(node) ?? false)) {
        return;
    }
    if (visible) {
        if (!nodes) {
            nodes = new Set();
            visibleNodes.set(anchor, nodes);
        }
        nodes.add(node);
    } else {
        nodes?.delete(node);
    }
    anchorsChanged.update((n) => n + 1);
}

/**
 * Names a UI element for onboarding: `{@attach onboarding("mapEditor.tool.entity")}`.
 *
 * Svelte runs an attachment inside an effect, so this one reads no reactive state: it would be torn down and
 * re-run on each change. It only reports when its node is visible and when it is clicked.
 */
export function onboarding(anchor: OnboardingAnchor): Attachment<HTMLElement> {
    return (node) => {
        const onClick = () => {
            // A copy: a listener may end its step, and the next step's listener must not get this same click.
            for (const listener of [...clickListeners]) {
                listener(anchor);
            }
            markUsed(anchor);
        };
        // Capture: the element's handler may close the menu that holds it, and the next step waits for this click.
        node.addEventListener("click", onClick, { capture: true });

        // Mounted is not visible: the action bar keeps the buttons that do not fit mounted in a clipped row.
        // With the viewport as root, the observer accounts for clipping by overflow-hidden ancestors and display: none.
        let observer: IntersectionObserver | undefined;
        if (typeof IntersectionObserver === "undefined") {
            setVisible(anchor, node, true);
        } else {
            observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    setVisible(anchor, node, entry.isIntersecting);
                }
            });
            observer.observe(node);
        }

        return () => {
            node.removeEventListener("click", onClick, { capture: true });
            observer?.disconnect();
            setVisible(anchor, node, false);
        };
    };
}
