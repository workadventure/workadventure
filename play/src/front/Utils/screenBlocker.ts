import type { Attachment } from "svelte/attachments";
import type { Box } from "../WebRtc/LayoutManager";
import { biggestAvailableAreaStore } from "../Stores/BiggestAvailableAreaStore";

const FINE_WINDOW_MARGIN = 1;
const INTERSECTION_RATIO_EPSILON = 0.0001;
const INTERSECTION_THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);

function boxFromDomRect(rect: DOMRectReadOnly): Box {
    return {
        xStart: rect.x,
        yStart: rect.y,
        xEnd: rect.right,
        yEnd: rect.bottom,
    };
}

function getResizeObserverEntrySize(entry: ResizeObserverEntry): { width: number; height: number } {
    const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;

    if (borderBoxSize) {
        return {
            width: borderBoxSize.inlineSize,
            height: borderBoxSize.blockSize,
        };
    }

    return {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
    };
}

function createFineWindowRootMargin(entry: IntersectionObserverEntry): string | undefined {
    if (!entry.rootBounds || entry.intersectionRatio <= 0) {
        return undefined;
    }

    const root = entry.rootBounds;
    const intersection = entry.intersectionRect;
    const top = Math.max(root.top, intersection.top - FINE_WINDOW_MARGIN);
    const right = Math.min(root.right, intersection.right + FINE_WINDOW_MARGIN);
    const bottom = Math.min(root.bottom, intersection.bottom + FINE_WINDOW_MARGIN);
    const left = Math.max(root.left, intersection.left - FINE_WINDOW_MARGIN);

    if (right <= left || bottom <= top) {
        return undefined;
    }

    const topMargin = root.top - top;
    const rightMargin = right - root.right;
    const bottomMargin = bottom - root.bottom;
    const leftMargin = root.left - left;

    return `${topMargin}px ${rightMargin}px ${bottomMargin}px ${leftMargin}px`;
}

function didIntersectionRatioChange(first: number, second: number): boolean {
    return Math.abs(first - second) > INTERSECTION_RATIO_EPSILON;
}

class ScreenBlockerPositionObserver {
    private observer: IntersectionObserver | undefined;
    private fineWindowIntersectionRatio: number | undefined;
    private currentBox: Box | undefined;
    private destroyed = false;

    constructor(private readonly element: HTMLElement) {}

    public observe(): void {
        if (this.destroyed || !("IntersectionObserver" in window)) {
            return;
        }

        this.observeWithWideWindow();
    }

    public updateSize(width: number, height: number): void {
        if (!this.currentBox) {
            // ResizeObserver can fire before IntersectionObserver has produced the first position.
            // In that case we only know something changed, so ask the game loop to recompute later.
            biggestAvailableAreaStore.requestRecompute();
            this.observeWithWideWindow();
            return;
        }

        this.currentBox = {
            ...this.currentBox,
            xEnd: this.currentBox.xStart + width,
            yEnd: this.currentBox.yStart + height,
        };
        biggestAvailableAreaStore.updateBlockerBox(this.element, this.currentBox);
        this.observeWithWideWindow();
    }

    public resetObservation(): void {
        this.observeWithWideWindow();
    }

    public destroy(): void {
        this.destroyed = true;
        this.observer?.disconnect();
        this.observer = undefined;
    }

    private observeWithWideWindow(): void {
        if (this.destroyed || !this.element.isConnected || !("IntersectionObserver" in window)) {
            return;
        }

        // First observe the blocker against the full viewport. This gives us the latest browser-computed
        // boundingClientRect without running our own getBoundingClientRect() polling loop.
        this.observer?.disconnect();
        this.observer = new IntersectionObserver((entries) => this.handleWideWindowIntersection(entries), {
            root: null,
            rootMargin: "0px",
            threshold: INTERSECTION_THRESHOLDS,
        });
        this.observer.observe(this.element);
    }

    private observeWithFineWindow(entry: IntersectionObserverEntry): void {
        const rootMargin = createFineWindowRootMargin(entry);
        if (!rootMargin) {
            return;
        }

        // Position-change detection based on IntersectionObserver ratio changes.
        // See "Approach 3 - Variant A" in:
        // https://dev.to/ajk-essential/observing-position-change-of-html-elements-using-intersection-observer-12de
        //
        // We replace the viewport observer with a tightly cropped root around the visible part of the element.
        // If the element moves, the intersection ratio inside that fine window changes, which is enough to mark
        // the blocker bounds dirty. The actual Woka reposition is still coalesced in GameScene.update().
        this.fineWindowIntersectionRatio = undefined;
        this.observer?.disconnect();
        this.observer = new IntersectionObserver((entries) => this.handleFineWindowIntersection(entries), {
            root: null,
            rootMargin,
            threshold: INTERSECTION_THRESHOLDS,
        });
        this.observer.observe(this.element);
    }

    private handleWideWindowIntersection(entries: IntersectionObserverEntry[]): void {
        const entry = entries.at(-1);
        if (!entry || this.destroyed) {
            return;
        }

        this.updateBoxFromIntersectionEntry(entry);
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
            this.observeWithFineWindow(entry);
        }
    }

    private handleFineWindowIntersection(entries: IntersectionObserverEntry[]): void {
        const entry = entries.at(-1);
        if (!entry || this.destroyed) {
            return;
        }

        this.updateBoxFromIntersectionEntry(entry);
        if (this.fineWindowIntersectionRatio === undefined) {
            // The first fine-window callback establishes the baseline. It may differ from the wide-window
            // ratio because the fine window has a small margin around the visible intersection.
            this.fineWindowIntersectionRatio = entry.intersectionRatio;
            return;
        }

        if (didIntersectionRatioChange(entry.intersectionRatio, this.fineWindowIntersectionRatio)) {
            // Movement was detected. Go back through the wide observer to refresh the cropped window around
            // the new position instead of continuously reading layout in requestAnimationFrame.
            this.observeWithWideWindow();
        }
    }

    private updateBoxFromIntersectionEntry(entry: IntersectionObserverEntry): void {
        this.currentBox = boxFromDomRect(entry.boundingClientRect);
        biggestAvailableAreaStore.updateBlockerBox(this.element, this.currentBox);
    }
}

export const blocker: Attachment<HTMLElement> = (element) => {
    const unregisterBlocker = biggestAvailableAreaStore.registerBlocker(element);
    const positionObserver = new ScreenBlockerPositionObserver(element);
    const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries.at(-1);
        if (!entry) {
            return;
        }

        const { width, height } = getResizeObserverEntrySize(entry);
        positionObserver.updateSize(width, height);
    });
    const resetObservation = () => positionObserver.resetObservation();

    resizeObserver.observe(element);
    positionObserver.observe();
    element.addEventListener("transitionrun", resetObservation);
    element.addEventListener("transitionend", resetObservation);
    element.addEventListener("animationstart", resetObservation);
    element.addEventListener("animationend", resetObservation);

    return () => {
        element.removeEventListener("transitionrun", resetObservation);
        element.removeEventListener("transitionend", resetObservation);
        element.removeEventListener("animationstart", resetObservation);
        element.removeEventListener("animationend", resetObservation);
        resizeObserver.disconnect();
        positionObserver.destroy();
        unregisterBlocker();
    };
};
