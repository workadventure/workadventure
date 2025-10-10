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
        const pipelineManager = renderer.pipelines as unknown as {
            addPostPipeline: (name: string, klass: unknown) => void;
            postPipelineClasses?: unknown;
        };
        const classes = pipelineManager.postPipelineClasses;
        let alreadyRegistered = false;
        if (classes) {
            if (classes instanceof Map) {
                alreadyRegistered = classes.has("DarkenOutsideAreaPipeline");
            } else if (typeof classes === "object") {
                alreadyRegistered = Object.prototype.hasOwnProperty.call(
                    classes as Record<string, unknown>,
                    "DarkenOutsideAreaPipeline"
                );
            }
        }
        if (!alreadyRegistered) {
            pipelineManager.addPostPipeline("DarkenOutsideAreaPipeline", DarkenOutsideAreaPipeline as unknown);
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
        this.worldRect = { x, y, width: w, height: h };
    }

    attachToArea(rectangle: RectangleLike): void {
        this.worldRect = rectangle;
    }

    /** Smoothly show the effect (darken outside). */
    show(durationMs: number = this._defaultDuration): void {
        if (this._enabled) return;
        this._enabled = true;
        if (!this.pipeline) {
            this.pipeline = this.attach();
        }

        // Start from 0 darkness
        const tweenObj: { value: number } = { value: 0 };
        this.pipeline.setDarkness(0);
        this.scene.tweens.add({
            targets: tweenObj,
            value: this._targetDarkness,
            duration: durationMs,
            onUpdate: () => this.pipeline && this.pipeline.setDarkness(tweenObj.value),
        });
    }

    /** Smoothly hide the effect and detach the pipeline at the end. */
    hide(durationMs: number = this._defaultDuration): void {
        if (!this._enabled) return;
        this._enabled = false;
        if (!this.pipeline) return; // already detached
        const tweenObj: { value: number } = { value: this.pipeline.darkness };
        this.scene.tweens.add({
            targets: tweenObj,
            value: 0,
            duration: durationMs,
            onUpdate: () => this.pipeline && this.pipeline.setDarkness(tweenObj.value),
            onComplete: () => this.detach(),
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
        this.detach();
    }
}

export default DarkenOutsideAreaEffect;
