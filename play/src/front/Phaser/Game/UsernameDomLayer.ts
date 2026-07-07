import { DEPTH_INGAME_TEXT_INDEX } from "./DepthIndexes";
import type { GameScene } from "./GameScene";

// Side of the square probe used to measure the ancestor scale. Large enough that sub-pixel rounding
// on the measured on-screen size is negligible.
const SCALE_PROBE_SIZE = 100;

export class UsernameDomLayer {
    private readonly container: HTMLDivElement;
    private readonly domElement: Phaser.GameObjects.DOMElement;
    // A hidden, fixed-size element living in the same container as the usernames. Phaser scales this
    // container to follow the camera, so the probe's measured on-screen width divided by its layout
    // width gives the exact scale the DOM layer applies on screen (`ancestorScale`). We measure it
    // rather than derive it from zoomModifier/actualZoom because the real value depends on the camera
    // zoom AND devicePixelRatio in a way those numbers do not capture (see UsernameDisplay).
    private readonly scaleProbe: HTMLDivElement;
    private ancestorScale = 1;
    private ancestorScaleStale = true;

    constructor(scene: GameScene) {
        this.container = document.createElement("div");
        this.container.style.position = "relative";
        this.container.style.pointerEvents = "none";
        this.container.style.overflow = "visible";

        this.scaleProbe = document.createElement("div");
        this.scaleProbe.style.position = "absolute";
        this.scaleProbe.style.top = "0";
        this.scaleProbe.style.left = "0";
        this.scaleProbe.style.width = `${SCALE_PROBE_SIZE}px`;
        this.scaleProbe.style.height = `${SCALE_PROBE_SIZE}px`;
        this.scaleProbe.style.visibility = "hidden";
        this.scaleProbe.style.pointerEvents = "none";
        this.container.appendChild(this.scaleProbe);

        this.domElement = scene.add.dom(0, 0, this.container).setOrigin(0, 0).setDepth(DEPTH_INGAME_TEXT_INDEX);

        this.domElement.pointerEvents = "none";
    }

    public setVisible(visible: boolean): void {
        this.domElement.setVisible(visible);
    }

    public addUsername(usernameDisplayElement: HTMLDivElement): void {
        this.container.appendChild(usernameDisplayElement);
    }

    /**
     * Marks the measured ancestor scale as stale so it is re-measured on the next read. Call this
     * whenever the camera zoom or the display (resize, device pixel ratio change) may have changed.
     */
    public invalidateAncestorScale(): void {
        this.ancestorScaleStale = true;
    }

    /**
     * The scale the DOM layer currently applies to its children on screen, measured from the probe.
     * Measurement is lazy and cached: the (potentially layout-forcing) `getBoundingClientRect` runs
     * at most once per invalidation, shared by every username. Read it at render time, once Phaser
     * has applied the layer's transform for the current frame.
     */
    public getAncestorScale(): number {
        if (this.ancestorScaleStale) {
            const width = this.scaleProbe.getBoundingClientRect().width;
            // Guard against a 0 measurement (layer not laid out yet): keep the previous value and
            // stay stale so we re-measure later.
            if (width > 0) {
                this.ancestorScale = width / SCALE_PROBE_SIZE;
                this.ancestorScaleStale = false;
            }
        }
        return this.ancestorScale;
    }

    public destroy(): void {
        this.domElement.destroy();
    }
}
