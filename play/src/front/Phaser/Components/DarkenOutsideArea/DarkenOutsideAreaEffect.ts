// DarkenOutsideAreaEffect.ts
// Helper that draws a single GPU overlay quad, keeps a WORLD rect bright,
// and provides show()/hide() with tweened darkness.

import * as Phaser from "phaser";

import { DEPTH_WHITE_MASK } from "../../Game/DepthIndexes";

import Linear = Phaser.Math.Linear;
import Shader = Phaser.GameObjects.Shader;

const FRAG_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

uniform vec4 uRect;
uniform vec4 uView;
uniform float uFeather;
uniform float uDarkness;
uniform float uPixelWorld;
uniform vec3 uColor;

float roundedRectSdf(vec2 p, vec2 center, vec2 halfSize, float radius) {
    vec2 q = abs(p - center) - (halfSize - vec2(radius));
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
    vec2 world = vec2(
        uView.x + outTexCoord.x * uView.z,
        uView.y + (1.0 - outTexCoord.y) * uView.w
    );

    vec2 center = vec2(
        uRect.x + uRect.z * 0.5,
        uRect.y + uRect.w * 0.5
    );

    vec2 halfSize = vec2(
        uRect.z * 0.5,
        uRect.w * 0.5
    );

    float radius = uFeather * 0.5;
    float dist = roundedRectSdf(world, center, halfSize, radius);
    float alpha = uDarkness;

    if (uFeather > 0.0) {
        alpha *= smoothstep(-uFeather * 0.5, uFeather * 0.5, dist - uPixelWorld * 0.5);
    } else {
        alpha *= step(0.0, dist);
    }

    if (alpha <= 0.0) {
        discard;
    }

    gl_FragColor = vec4(uColor, alpha);
}
`;

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
    private overlay?: Shader;
    private updateCb: () => void;
    private _enabled = false;
    private _currentDarkness = 0;

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
    private effectiveRect: RectangleLike = { x: 0, y: 0, width: 1, height: 1 };
    private viewRect: RectangleLike = { x: 0, y: 0, width: 1, height: 1 };

    constructor(
        scene: Phaser.Scene,
        camera: Phaser.Cameras.Scene2D.Camera = scene.cameras.main,
        opts: DarkenOutsideOptions = {},
    ) {
        this.scene = scene;
        this.camera = camera;

        this._feather = opts.feather ?? 24;
        this._targetDarkness = opts.darkness ?? 0.6;
        this._defaultDuration = opts.tweenDurationMs ?? 300;
        this._color = opts.color ?? new Phaser.Display.Color(0, 0, 0);

        this.updateCb = this.update.bind(this);
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateCb);
    }

    private attach(): Shader {
        if (this.overlay) {
            return this.overlay;
        }

        const overlay = this.scene.add.shader(
            {
                name: "DarkenOutsideAreaOverlay",
                shaderName: "DarkenOutsideAreaOverlay",
                fragmentSource: FRAG_SHADER,
                setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
                    setUniform("uRect", [
                        this.effectiveRect.x,
                        this.effectiveRect.y,
                        this.effectiveRect.width,
                        this.effectiveRect.height,
                    ]);
                    setUniform("uView", [this.viewRect.x, this.viewRect.y, this.viewRect.width, this.viewRect.height]);
                    setUniform("uFeather", Math.max(0, this._feather / this.camera.zoom));
                    setUniform("uDarkness", Phaser.Math.Clamp(this._currentDarkness, 0, 1));
                    setUniform("uPixelWorld", 1 / this.camera.zoom);
                    setUniform("uColor", [this._color.redGL, this._color.greenGL, this._color.blueGL]);
                },
            },
            0,
            0,
            1,
            1,
        );
        overlay.setDepth(DEPTH_WHITE_MASK - 1);
        overlay.setOrigin(0, 0);
        overlay.setVisible(false);

        this.overlay = overlay;
        this.update();

        return overlay;
    }

    private detach(): void {
        if (!this.overlay) {
            return;
        }

        this.overlay.destroy();
        this.overlay = undefined;
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
        return this._currentDarkness;
    }

    /** Update the overlay geometry every frame. */
    private update(): void {
        if (!this.overlay) return;

        const cam = this.camera;

        const { vwx, vwy } = this.getCameraWorldCoords();
        const viewWidth = cam.width / cam.zoom;
        const viewHeight = cam.height / cam.zoom;

        this.effectiveRect = {
            x: this.worldRect.width > 0 ? this.worldRect.x : vwx,
            y: this.worldRect.height > 0 ? this.worldRect.y : vwy,
            width: this.worldRect.width > 0 ? this.worldRect.width : viewWidth,
            height: this.worldRect.height > 0 ? this.worldRect.height : viewHeight,
        };
        this.viewRect = {
            x: vwx,
            y: vwy,
            width: viewWidth,
            height: viewHeight,
        };

        this.overlay
            .setPosition(this.viewRect.x, this.viewRect.y)
            .setSize(this.viewRect.width, this.viewRect.height)
            .setVisible(this._currentDarkness > 0);
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
        this.update();
    }

    attachToArea(rectangle: RectangleLike): void {
        this.worldRect = rectangle;
        this.update();
    }

    /** Smoothly show the effect (darken outside). If a tween is running, cancel it and resume from the current value. */
    show(durationMs: number = this._defaultDuration): void {
        this._enabled = true;

        const wasAttached = !!this.overlay;
        this.attach();
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
            this._currentDarkness = target;
            this.update();
            return;
        }

        this._tweenObj.value = start;
        this._currentDarkness = start;
        this.update();

        this._tween = this.scene.tweens.add({
            targets: this._tweenObj,
            value: target,
            duration: durationMs,
            onUpdate: () => {
                this._currentDarkness = this._tweenObj.value;
                this.update();
            },
            onComplete: () => {
                this._tween = undefined;
                // ensure final value is applied
                this._currentDarkness = target;
                this.update();
            },
        });
    }

    /** Smoothly hide the effect and detach the pipeline at the end. If a tween is running, cancel it and resume from the current value. */
    hide(durationMs: number = this._defaultDuration): void {
        this._enabled = false;

        if (!this.overlay) {
            // Already hidden/detached => nothing to animate
            return;
        }

        // Cancel any running tween and start from the last applied darkness
        this.stopCurrentTween();
        const start = this.currentDarkness();
        const target = 0;

        if (Math.abs(start - target) < 0.001) {
            // Already effectively hidden, ensure 0 and detach immediately
            this._currentDarkness = 0;
            this.update();
            this.detach();
            return;
        }

        this._tweenObj.value = start;
        this._currentDarkness = start;
        this.update();

        this._tween = this.scene.tweens.add({
            targets: this._tweenObj,
            value: target,
            duration: durationMs,
            onUpdate: () => {
                this._currentDarkness = this._tweenObj.value;
                this.update();
            },
            onComplete: () => {
                this._tween = undefined;
                this._currentDarkness = 0;
                this.update();
                this.detach();
            },
        });
    }

    /** Adjust feather (pixels, screen space). */
    setFeather(pixels: number): void {
        this._feather = pixels;
        this.update();
    }

    /** Adjust darkness color. */
    setColor(color: Phaser.Display.Color): void {
        this._color = color;
        this.update();
    }

    /** Adjust target darkness for future .show() calls. */
    setTargetDarkness(intensity01: number): void {
        this._targetDarkness = intensity01;
        if (this._enabled && this.overlay) {
            this._currentDarkness = this._targetDarkness;
            this.update();
        }
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
