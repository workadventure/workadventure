interface MapPanShortcutHandlers {
    /** Whether this press should pan the map (middle button, or Space + left button where allowed). */
    canStart(event: PointerEvent): boolean;
    /** Called on the first movement, so a press without movement changes nothing. */
    start(): void;
    /** Movement since the last call, in CSS pixels, in the direction the view should move. */
    pan(deltaX: number, deltaY: number): void;
}

/**
 * Pans the map with the middle button, or with Space + left button. The pointerdown is cancelled, so the browser
 * sends no mousedown, mousemove or mouseup for the gesture: Phaser never sees it, and neither do the map editor
 * tools or the objects they let you drag.
 */
export class MapPanShortcut {
    private pointerId: number | undefined;
    private last = { x: 0, y: 0 };
    private moved = false;
    private cursorBefore = "";

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly handlers: MapPanShortcutHandlers,
    ) {
        // Capture phase: runs before the other canvas listeners, which stopImmediatePropagation then skips.
        this.canvas.addEventListener("pointerdown", this.onDown, { capture: true });
        this.canvas.addEventListener("pointermove", this.onMove);
        this.canvas.addEventListener("pointerup", this.onEnd);
        this.canvas.addEventListener("pointercancel", this.onEnd);
        this.canvas.addEventListener("lostpointercapture", this.onEnd);
    }

    private readonly onDown = (event: PointerEvent): void => {
        if (this.pointerId !== undefined || event.pointerType !== "mouse" || !this.handlers.canStart(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.canvas.setPointerCapture(event.pointerId);
        this.pointerId = event.pointerId;
        this.last = { x: event.clientX, y: event.clientY };
        this.moved = false;
        this.cursorBefore = this.canvas.style.cursor;
        this.canvas.style.cursor = "grabbing";
    };

    private readonly onMove = (event: PointerEvent): void => {
        if (event.pointerId !== this.pointerId) return;
        const deltaX = this.last.x - event.clientX;
        const deltaY = this.last.y - event.clientY;
        this.last = { x: event.clientX, y: event.clientY };
        if (deltaX === 0 && deltaY === 0) return;
        if (!this.moved) this.handlers.start();
        this.moved = true;
        this.handlers.pan(deltaX, deltaY);
    };

    private readonly onEnd = (event: PointerEvent): void => {
        if (event.pointerId !== this.pointerId) return;
        this.pointerId = undefined;
        this.canvas.style.cursor = this.cursorBefore;
        if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    };

    public destroy(): void {
        this.canvas.removeEventListener("pointerdown", this.onDown, { capture: true });
        this.canvas.removeEventListener("pointermove", this.onMove);
        this.canvas.removeEventListener("pointerup", this.onEnd);
        this.canvas.removeEventListener("pointercancel", this.onEnd);
        this.canvas.removeEventListener("lostpointercapture", this.onEnd);
    }
}
