// DarkenOutsideAreaPipeline.ts
// Phaser 3 PostFX pipeline that darkens everything outside a given screen-space rect.
// Feather and darkness are configurable via uniforms.

import Phaser from "phaser";

export class DarkenOutsideAreaPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    private _rect = new Phaser.Math.Vector4(0, 0, 0, 0);
    private _feather = 24; // pixels
    private _darkness = 0.6; // 0..1
    private _color = new Phaser.Display.Color(0, 0, 0);

    constructor(game: Phaser.Game) {
        super({
            game,
            name: "DarkenOutsideAreaPipeline",
            fragShader: `
      precision mediump float;

      uniform sampler2D uMainSampler;
      varying vec2 outTexCoord;

      // Screen-space uniforms (pixels)
      uniform vec4 uRect;      // x, y, w, h in SCREEN pixels
      uniform float uFeather;  // pixels
      uniform float uDarkness; // 0..1
      uniform vec3 uColor;

      float distance(vec2 p, vec2 center, vec2 halfSize, float radius) {
        vec2 q = abs(p - center) - (halfSize - vec2(radius));
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
      }

      void main() {
        vec4 color = texture2D(uMainSampler, outTexCoord);
        vec2 p = gl_FragCoord.xy;

        vec2 center = vec2(uRect.x + uRect.z * 0.5, uRect.y + uRect.w * 0.5);
        vec2 halfSize = vec2(uRect.z * 0.5, uRect.w * 0.5);

        float dist = distance(p, center, halfSize, uFeather * 0.5);

        float border = smoothstep(-uFeather * 0.5, uFeather * 0.5, dist - 0.5);
        float alpha = mix(color.a, 0.5, border);
        vec3 finalColor = mix(color.rgb, uColor, border * uDarkness);

        gl_FragColor = vec4(finalColor, alpha);
      }`,
        });
    }

    onBoot(): void {
        // uniforms are pushed in onPreRender when shader is bound
    }

    /** Called each frame before rendering to push current uniforms. */
    onPreRender(): void {
        this.set4f("uRect", this._rect.x, this._rect.y, this._rect.z, this._rect.w);
        this.set1f("uFeather", this._feather);
        this.set1f("uDarkness", this._darkness);
        this.set3f("uColor", this._color.redGL, this._color.greenGL, this._color.blueGL);
    }

    /** Set screen-space rect (pixels). */
    setScreenRect(x: number, y: number, w: number, h: number): void {
        this._rect.set(x, y, w, h);
    }

    /** Feather (pixels). */
    setFeather(pixels: number): void {
        this._feather = pixels;
    }

    /** Darkness intensity [0..1]. */
    setDarkness(intensity01: number): void {
        this._darkness = intensity01;
    }

    setColor(color: Phaser.Display.Color): void {
        this._color = color;
    }

    get feather(): number {
        return this._feather;
    }
    get darkness(): number {
        return this._darkness;
    }

    get color(): Phaser.Display.Color {
        return this._color;
    }
}
