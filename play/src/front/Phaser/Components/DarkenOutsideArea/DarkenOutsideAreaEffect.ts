// DarkenOutsideAreaEffect.ts
// Helper that:
// - registers/attaches the pipeline to a camera,
// - converts a WORLD rect to a SCREEN rect each frame,
// - provides show()/hide() with tweened darkness.

import Phaser from "phaser";
import { DarkenOutsideAreaPipeline } from "./DarkenOutsideAreaPipeline";

export interface DarkenOutsideOptions {
    feather?: number; // edge softness in pixels (screen space)
    darkness?: number; // 0..1 target darkness when shown
    tweenDurationMs?: number; // default show/hide duration
}

export class DarkenOutsideAreaEffect {
    private scene: Phaser.Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private pipeline!: DarkenOutsideAreaPipeline;
    private updateCb: () => void;
    private _enabled = false;

    private _targetDarkness: number;
    private _feather: number;
    private _defaultDuration: number;

    // World-space rect we keep bright
    public worldRect = new Phaser.Geom.Rectangle(0, 0, 0, 0);

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

        // Ensure pipeline is registered once (via PipelineManager)
        const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
        const pipelineManager = renderer.pipelines;
        if (
            !pipelineManager.postPipelineClasses ||
            !pipelineManager.postPipelineClasses.has("DarkenOutsideAreaPipeline")
        ) {
            pipelineManager.addPostPipeline("DarkenOutsideAreaPipeline", DarkenOutsideAreaPipeline);
        }

        // Attach to camera (if not already attached)
        let p = this.camera.getPostPipeline("DarkenOutsideAreaPipeline");
        if (!p || (Array.isArray(p) && p.length === 0)) {
            this.camera.setPostPipeline("DarkenOutsideAreaPipeline");
            p = this.camera.getPostPipeline("DarkenOutsideAreaPipeline");
        }
        const pp = Array.isArray(p) ? p[0] : p;
        this.pipeline = pp as DarkenOutsideAreaPipeline;

        // Initial uniforms
        this.pipeline.setFeather(this._feather);
        this.pipeline.setDarkness(0); // start hidden

        // Per-frame updater
        this.updateCb = this.update.bind(this);
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateCb);
    }

    /** Update screen-space rect uniform every frame. */
    private update(): void {
        if (!this.pipeline) return;

        const cam = this.camera;

        // Use full camera rect if worldRect was not set yet to avoid darkening everything by default
        const worldW = this.worldRect.width > 0 ? this.worldRect.width : cam.width / cam.zoom;
        const worldH = this.worldRect.height > 0 ? this.worldRect.height : cam.height / cam.zoom;
        const worldX = this.worldRect.width > 0 ? this.worldRect.x : cam.scrollX;
        const worldY = this.worldRect.height > 0 ? this.worldRect.y : cam.scrollY;

        // Convert WORLD rect to CAMERA-LOCAL SCREEN pixels
        const sx = (worldX - cam.scrollX) * cam.zoom;
        const syTop = (worldY - cam.scrollY) * cam.zoom;
        const sw = worldW * cam.zoom;
        const sh = worldH * cam.zoom;

        // Flip Y for gl_FragCoord bottom-left origin within the camera's render target
        const syGL = cam.height - (syTop + sh);

        this.pipeline.setScreenRect(sx, syGL, sw, sh);
        // feather/darkness are set via setters or tweens
    }

    /** Set the world-space rectangle to keep bright. */
    setWorldRect(x: number, y: number, w: number, h: number): void {
        this.worldRect.setTo(x, y, w, h);
    }

    /** Smoothly show the effect (darken outside). */
    show(durationMs: number = this._defaultDuration): void {
        if (this._enabled) return;
        this._enabled = true;
        const tweenObj: { value: number } = { value: 0 };
        this.scene.tweens.add({
            targets: tweenObj,
            value: this._targetDarkness,
            duration: durationMs,
            onUpdate: () => this.pipeline.setDarkness(tweenObj.value),
        });
    }

    /** Smoothly hide the effect. */
    hide(durationMs: number = this._defaultDuration): void {
        if (!this._enabled) return;
        this._enabled = false;
        const tweenObj: { value: number } = { value: this.pipeline.darkness };
        this.scene.tweens.add({
            targets: tweenObj,
            value: 0,
            duration: durationMs,
            onUpdate: () => this.pipeline.setDarkness(tweenObj.value),
        });
    }

    /** Adjust feather (pixels, screen space). */
    setFeather(pixels: number): void {
        this._feather = pixels;
        this.pipeline.setFeather(pixels);
    }

    /** Adjust target darkness for future .show() calls. */
    setTargetDarkness(intensity01: number): void {
        this._targetDarkness = intensity01;
        if (this._enabled) this.pipeline.setDarkness(intensity01);
    }

    /** Clean up listeners (pipeline remains attached to the camera). */
    destroy(): void {
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateCb);
    }
}
