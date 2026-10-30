/**
 * How far, in game pixels, a pointer must move before a press becomes a map drag rather than a click or tap.
 * A finger jitters more than a mouse (Android uses 8 dp for the same purpose, iOS about 10 pt).
 */
export function mapDragThreshold(pointer: { wasTouch?: boolean }): number {
    return pointer.wasTouch ? 10 : 6;
}

interface DragPointer {
    id: number;
    x: number;
    y: number;
    wasTouch?: boolean;
}

/** Distinguishes a map drag from a click without tying the gesture to camera or player state. */
export class MapDragGesture {
    private origin?: DragPointer;
    private previous?: DragPointer;
    private dragging = false;
    private cancelled = false;
    private threshold = 0;

    public begin(pointer: DragPointer): void {
        // Phaser exposes x/y as prototype getters, so spreading the pointer loses its coordinates.
        this.origin = { id: pointer.id, x: pointer.x, y: pointer.y };
        this.threshold = mapDragThreshold(pointer);
        this.previous = { ...this.origin };
        this.dragging = false;
        this.cancelled = false;
    }

    public move(pointer: DragPointer): { x: number; y: number } | undefined {
        if (!this.origin || !this.previous || pointer.id !== this.origin.id) {
            return;
        }
        if (!this.dragging && Math.hypot(pointer.x - this.origin.x, pointer.y - this.origin.y) < this.threshold) {
            return;
        }
        this.dragging = true;
        const delta = { x: this.previous.x - pointer.x, y: this.previous.y - pointer.y };
        this.previous = { id: pointer.id, x: pointer.x, y: pointer.y };
        return delta;
    }

    /** Returns true when releasing this pointer must not activate the object under the cursor. */
    public end(pointerId: number): boolean {
        if (this.origin && pointerId !== this.origin.id) {
            return false;
        }
        const consumed = this.dragging || this.cancelled;
        this.origin = undefined;
        this.previous = undefined;
        this.dragging = false;
        this.cancelled = false;
        return consumed;
    }

    public cancel(): void {
        this.cancelled ||= this.origin !== undefined;
        this.origin = undefined;
        this.previous = undefined;
        this.dragging = false;
    }
}
