export const LONG_PRESS_DELAY_MS = 500;
// A finger drifting further than this is scrolling, not holding.
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

/**
 * The timing part of a long press, kept apart from the DOM so it can be tested with fake timers.
 * `start` arms the timer, a move beyond the tolerance or `cancel` disarms it, and `consumeFired` tells
 * the caller once whether the press ended as a handled long press.
 * `onLongPress` returns false when it had nothing to do with the press, which then stays a normal touch.
 */
export class LongPressGesture {
    private timer: ReturnType<typeof setTimeout> | undefined;
    private startX = 0;
    private startY = 0;
    private fired = false;

    constructor(
        private readonly onLongPress: () => boolean,
        private readonly delayMs = LONG_PRESS_DELAY_MS,
        private readonly moveTolerancePx = LONG_PRESS_MOVE_TOLERANCE_PX,
    ) {}

    get isPressing(): boolean {
        return this.timer !== undefined;
    }

    get hasFired(): boolean {
        return this.fired;
    }

    start(x: number, y: number): void {
        this.cancel();
        this.fired = false;
        this.startX = x;
        this.startY = y;
        this.timer = setTimeout(() => this.fire(), this.delayMs);
    }

    move(x: number, y: number): void {
        if (this.isPressing && Math.hypot(x - this.startX, y - this.startY) > this.moveTolerancePx) {
            this.cancel();
        }
    }

    /** Fires right away, for a browser that announces the long press itself (contextmenu) before our timer. */
    fire(): void {
        this.cancel();
        this.fired = this.onLongPress();
    }

    cancel(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
    }

    consumeFired(): boolean {
        const fired = this.fired;
        this.fired = false;
        return fired;
    }
}

/**
 * Svelte action: calls `onLongPress` when a finger rests on the node (see LongPressGesture for its return value). Mouse and pen are left alone (they have
 * hover), so are links, buttons and fields, which keep their native long-press menu. A scroll cancels the press:
 * the browser sends pointercancel when it takes the gesture over, and the move tolerance covers the rest.
 */
export function longPress(node: HTMLElement, onLongPress: () => boolean) {
    // The click that ends a long press lands wherever the finger was, often on what the long press just opened
    // (a sheet drawn under the finger): swallow that one click, wherever it lands.
    const swallowClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        stopSwallowingClick();
    };
    const stopSwallowingClick = () => window.removeEventListener("click", swallowClick, true);
    const gesture = new LongPressGesture(() => {
        const handled = onLongPress();
        if (handled) {
            window.addEventListener("click", swallowClick, true);
        }
        return handled;
    });
    const onPointerDown = (event: PointerEvent) => {
        if (
            event.pointerType !== "touch" ||
            !event.isPrimary ||
            (event.target instanceof Element && event.target.closest("a, button, input, textarea, [contenteditable]"))
        ) {
            return;
        }
        gesture.start(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => gesture.move(event.clientX, event.clientY);
    const onPointerEnd = () => {
        gesture.cancel();
        if (gesture.consumeFired()) {
            // No click came after all (some browsers send none after a long press): do not eat a later one.
            setTimeout(stopSwallowingClick, 400);
        }
    };
    // Android announces its own long press with a contextmenu event, sometimes before our timer: take it as ours.
    const onContextMenu = (event: Event) => {
        if (gesture.isPressing) {
            gesture.fire();
        }
        if (gesture.hasFired) {
            event.preventDefault();
        }
    };
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerEnd);
    node.addEventListener("pointercancel", onPointerEnd);
    node.addEventListener("contextmenu", onContextMenu);

    return {
        destroy() {
            gesture.cancel();
            stopSwallowingClick();
            node.removeEventListener("pointerdown", onPointerDown);
            node.removeEventListener("pointermove", onPointerMove);
            node.removeEventListener("pointerup", onPointerEnd);
            node.removeEventListener("pointercancel", onPointerEnd);
            node.removeEventListener("contextmenu", onContextMenu);
        },
    };
}
