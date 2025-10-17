// DarkenOutsideAreaEffect.ts
// Helper that:
// - registers/attaches the pipeline to a camera,
// - converts a WORLD rect to a SCREEN rect each frame,
// - provides show()/hide() with tweened darkness.

import Phaser from "phaser";
import { DarkenOutsideAreaPipeline } from "./DarkenOutsideAreaPipeline";
import Linear = Phaser.Math.Linear;

export interface DarkenOutsideOptions {
    feather?: number; // edge softness in pixels (screen space)
    darkness?: number; // 0..1 target darkness when shown
    tweenDurationMs?: number; // default show/hide duration
    color?: Phaser.Display.Color; // darkness color
}

interface RectangleLike {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class DarkenOutsideAreaEffect {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private pipeline?: DarkenOutsideAreaPipeline;
    private updateCb: () => void;
    private _enabled = false;

    private _targetDarkness: number;
    private _feather: number;
    private _defaultDuration: number;
    private _color: Phaser.Display.Color;

    // Keep a reference to the current tween to be able to cancel/retarget it
    private _tween?: Phaser.Tweens.Tween;
    // Reusable tween state holder (value in [0..1])
    private _tweenObj: { value: number } = { value: 0 };

    // World-space rect we keep bright
    private worldRect: RectangleLike = { x: 0, y: 0, width: 0, height: 0 };

    constructor(
        scene: Phaser.Scene,
        camera: Phaser.Cameras.Scene2D.Camera = scene.cameras.main,
        opts: DarkenOutsideOptions = {}
    ) {
        this.scene = scene;
        this.camera = camera;

        this._feather = opts.feather ?? 24;
        this._targetDarkness = opts.darkness ?? 0.6;
        this._defaultDuration = opts.tweenDurationMs ?? 300;
        this._color = opts.color ?? new Phaser.Display.Color(0, 0, 0);

        // Ensure post-pipeline class is registered once (PipelineManager)
        const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
        const pipelineManager = renderer.pipelines;
        const classes = pipelineManager.postPipelineClasses;
        if (!classes?.has("DarkenOutsideAreaPipeline")) {
            pipelineManager.addPostPipeline("DarkenOutsideAreaPipeline", DarkenOutsideAreaPipeline);
        }

        // Do NOT attach the post pipeline yet; we attach lazily on show()

        // Per-frame updater
        this.updateCb = this.update.bind(this);
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateCb);
    }

    /** Ensure the camera has the post pipeline attached and capture its instance. */
    private attach(): DarkenOutsideAreaPipeline {
        let p = this.camera.getPostPipeline("DarkenOutsideAreaPipeline");
        if (!p || (Array.isArray(p) && p.length === 0)) {
            this.camera.setPostPipeline("DarkenOutsideAreaPipeline");
            p = this.camera.getPostPipeline("DarkenOutsideAreaPipeline");
        }
        const pp = Array.isArray(p) ? p[0] : p;
        const pipeline = pp as DarkenOutsideAreaPipeline;
        // push initial uniforms on next onPreRender
        pipeline.setFeather(this._feather);
        pipeline.setColor(this._color);
        return pipeline;
    }

    /** Remove the post pipeline from the camera and clear local reference. */
    private detach(): void {
        if (this.pipeline) {
            this.camera.removePostPipeline("DarkenOutsideAreaPipeline");
            this.pipeline = undefined;
        }
    }

    /** Stop and clear the current tween if any. */
    private stopCurrentTween(): void {
        if (this._tween) {
            this._tween.stop();
            this._tween = undefined;
        }
    }

    /** Get the current effective darkness (from pipeline if attached). */
    private currentDarkness(): number {
        if (this.pipeline) return this.pipeline.darkness;
        return 0;
    }

    /** Update screen-space rect uniform every frame. */
    private update(): void {
        if (!this.pipeline) return;

        const cam = this.camera;

        const { vwx, vwy } = this.getCameraWorldCoords();

        // Use full camera rect if worldRect was not set yet to avoid darkening everything by default
        const worldW = this.worldRect.width > 0 ? this.worldRect.width : cam.width / cam.zoom;
        const worldH = this.worldRect.height > 0 ? this.worldRect.height : cam.height / cam.zoom;
        const worldX = this.worldRect.width > 0 ? this.worldRect.x : cam.scrollX;
        const worldY = this.worldRect.height > 0 ? this.worldRect.y : cam.scrollY;

        // Convert WORLD rect to CAMERA-LOCAL SCREEN pixels
        const sx = (worldX - vwx) * cam.zoom;
        const syTop = (worldY - vwy) * cam.zoom;
        const sw = worldW * cam.zoom;
        const sh = worldH * cam.zoom;

        // Flip Y for gl_FragCoord bottom-left origin within the camera's render target
        const syGL = cam.height - (syTop + sh);

        this.pipeline.setScreenRect(sx, syGL, sw, sh);
        // feather/darkness are set via setters or tweens
    }

    private getCameraWorldCoords(): { vwx: number; vwy: number } {
        // Note: in order to transform world coordinates to screen coordinates, we could use the cam.worldView
        // property. The issue is that the cam.worldView is updated on PRE_RENDER, which is after our POST_UPDATE.
        // So we would be one frame late, which is noticeable when moving the camera.
        // To work around this, we perform the same calculation as Phaser to compute the worldView here.
        // This is not ideal as it duplicates Phaser code, but it works.
        // See Phaser.Cameras.Scene2D.Camera.preRender()

        const cam = this.camera;

        const width = cam.width;
        const height = cam.height;

        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;

        let camSx = cam.scrollX;
        let camSy = cam.scrollY;

        const originX = width * cam.originX;
        const originY = height * cam.originY;

        // @ts-ignore We know _follow exists even if not public
        const follow = cam._follow as { x: number; y: number } | undefined;

        if (follow && !cam.panEffect.isRunning) {
            const lerp = cam.lerp;

            const fx = follow.x - cam.followOffset.x;
            const fy = follow.y - cam.followOffset.y;

            camSx = Linear(camSx, fx - originX, lerp.x);
            camSy = Linear(camSy, fy - originY, lerp.y);
        }

        camSx = Math.floor(camSx);
        camSy = Math.floor(camSy);

        if (cam.useBounds) {
            camSx = cam.clampX(camSx);
            camSy = cam.clampY(camSy);
        }

        const midX = camSx + halfWidth;
        const midY = camSy + halfHeight;

        const displayWidth = Math.floor(width / cam.zoomX + 0.5);
        const displayHeight = Math.floor(height / cam.zoomY + 0.5);

        const vwx = Math.floor(midX - displayWidth / 2 + 0.5);
        const vwy = Math.floor(midY - displayHeight / 2 + 0.5);

        return { vwx, vwy };
    }

    /** Set the world-space rectangle to keep bright. */
    setWorldRect(x: number, y: number, w: number, h: number): void {
        this.worldRect = { x, y, width: w, height: h };
    }

    attachToArea(rectangle: RectangleLike): void {
        this.worldRect = rectangle;
    }

    /** Smoothly show the effect (darken outside). If a tween is running, cancel it and resume from the current value. */
    show(durationMs: number = this._defaultDuration): void {
        this._enabled = true;

        const wasAttached = !!this.pipeline;
        if (!wasAttached) {
            this.pipeline = this.attach();
        }
        const justAttached = !wasAttached;

        // Cancel any running tween and start from the last applied darkness
        this.stopCurrentTween();
        let start = this.currentDarkness();
        const target = this._targetDarkness;

        // On first attach, force start from 0 to guarantee an animation
        if (justAttached) {
            start = 0;
        }

        // If already at target (within epsilon) and not a fresh attach, nothing to do
        if (!justAttached && Math.abs(start - target) < 0.001) {
            if (this.pipeline) this.pipeline.setDarkness(target);
            return;
        }

        this._tweenObj.value = start;
        if (this.pipeline) this.pipeline.setDarkness(start);

        this._tween = this.scene.tweens.add({
            targets: this._tweenObj,
            value: target,
            duration: durationMs,
            onUpdate: () => this.pipeline && this.pipeline.setDarkness(this._tweenObj.value),
            onComplete: () => {
                this._tween = undefined;
                // ensure final value is applied
                if (this.pipeline) this.pipeline.setDarkness(target);
            },
        });
    }

    /** Smoothly hide the effect and detach the pipeline at the end. If a tween is running, cancel it and resume from the current value. */
    hide(durationMs: number = this._defaultDuration): void {
        this._enabled = false;

        if (!this.pipeline) {
            // Already hidden/detached => nothing to animate
            return;
        }

        // Cancel any running tween and start from the last applied darkness
        this.stopCurrentTween();
        const start = this.currentDarkness();
        const target = 0;

        if (Math.abs(start - target) < 0.001) {
            // Already effectively hidden, ensure 0 and detach immediately
            this.pipeline.setDarkness(0);
            this.detach();
            return;
        }

        this._tweenObj.value = start;
        this.pipeline.setDarkness(start);

        this._tween = this.scene.tweens.add({
            targets: this._tweenObj,
            value: target,
            duration: durationMs,
            onUpdate: () => this.pipeline && this.pipeline.setDarkness(this._tweenObj.value),
            onComplete: () => {
                this._tween = undefined;
                if (this.pipeline) this.pipeline.setDarkness(0);
                this.detach();
            },
        });
    }

    /** Adjust feather (pixels, screen space). */
    setFeather(pixels: number): void {
        this._feather = pixels;
        if (this.pipeline) this.pipeline.setFeather(pixels);
    }

    /** Adjust darkness color. */
    setColor(color: Phaser.Display.Color): void {
        this._color = color;
        if (this.pipeline) this.pipeline.setColor(color);
    }

    /** Adjust target darkness for future .show() calls. */
    setTargetDarkness(intensity01: number): void {
        this._targetDarkness = intensity01;
        if (this._enabled && this.pipeline) this.pipeline.setDarkness(intensity01);
    }

    setTransitionDuration(durationMs: number): void {
        this._defaultDuration = durationMs;
    }

    /** Manually enable or disable the shader (attach/detach). */
    setActive(active: boolean, durationMs: number = this._defaultDuration): void {
        if (active) {
            this.show(durationMs);
        } else {
            this.hide(durationMs);
        }
    }

    /** Clean up listeners (pipeline remains detached/attached as-is). */
    destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateCb);
        this.stopCurrentTween();
        this.detach();
    }
}

export default DarkenOutsideAreaEffect;
