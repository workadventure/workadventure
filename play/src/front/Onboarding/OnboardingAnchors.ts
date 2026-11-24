import type { Attachment } from "svelte/attachments";
import { writable } from "svelte/store";
import type { OnboardingAnchor } from "@workadventure/messages";

/** The visible nodes of each anchor. A node that is mounted but clipped or hidden is not in here. */
const visibleNodes = new Map<OnboardingAnchor, Set<HTMLElement>>();
const clickListeners = new Set<(anchor: OnboardingAnchor, event: MouseEvent) => void>();
const useListeners = new Set<(anchor: OnboardingAnchor) => void>();

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

/** Called on every click on an anchor, before the element's own handlers, which `preventDefault()` keeps it from. */
export function onAnchorClick(listener: (anchor: OnboardingAnchor, event: MouseEvent) => void): () => void {
    clickListeners.add(listener);
    return () => clickListeners.delete(listener);
}

/** Called on every real use of an anchor: a click that reached the element. */
export function onAnchorUsed(listener: (anchor: OnboardingAnchor) => void): () => void {
    useListeners.add(listener);
    return () => useListeners.delete(listener);
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
        const onClick = (event: MouseEvent) => {
            // A copy: a listener may end its step, and the next step's listener must not get this same click.
            for (const listener of [...clickListeners]) {
                listener(anchor, event);
            }
            // The tutorial's lock step does not count as having locked a bubble.
            if (!event.defaultPrevented) {
                for (const listener of [...useListeners]) {
                    listener(anchor);
                }
            }
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
