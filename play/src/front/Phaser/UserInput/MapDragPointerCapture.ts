/** Keep mouse drags on the game canvas while crossing HTML overlays. */
export class MapDragPointerCapture {
    private pointerId: number | undefined;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly canCapture: () => boolean,
        private readonly onCancel: () => void,
    ) {
        this.canvas.addEventListener("pointerdown", this.onDown);
        this.canvas.addEventListener("pointercancel", this.onPointerCancel);
        this.canvas.addEventListener("lostpointercapture", this.onLostCapture);
    }

    public get active(): boolean {
        return this.pointerId !== undefined;
    }

    private readonly onDown = (event: PointerEvent): void => {
        if (event.pointerType !== "mouse" || event.button !== 0 || !this.canCapture()) return;
        this.canvas.setPointerCapture(event.pointerId);
        this.pointerId = event.pointerId;
    };

    private readonly onPointerCancel = (event: PointerEvent): void => {
        if (event.pointerId === this.pointerId) this.onCancel();
    };

    private readonly onLostCapture = (event: PointerEvent): void => {
        // Automatic release precedes the compatibility mouseup on some browsers.
        // Let Phaser finish that mouseup, including inertia, instead of cancelling it.
        if (event.pointerId === this.pointerId && (event.buttons & 1) !== 0) this.onCancel();
    };

    public release(): void {
        const id = this.pointerId;
        this.pointerId = undefined;
        if (id !== undefined && this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    }

    public destroy(): void {
        this.release();
        this.canvas.removeEventListener("pointerdown", this.onDown);
        this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
        this.canvas.removeEventListener("lostpointercapture", this.onLostCapture);
    }
}
