// DarkenOutsideAreaFilter.ts
// Phaser 4 filter that darkens everything outside a given camera-local screen-space rect.

import * as Phaser from "phaser";

export const DarkenOutsideAreaFilterName = "FilterDarkenOutsideArea";

const FRAG_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
varying vec2 outFragCoord;
varying vec2 outTexCoord;

// Camera-local screen-space uniforms, in pixels.
// uRect uses GL-style coordinates: origin bottom-left.
uniform vec4 uRect;       // x, y, w, h
uniform float uFeather;   // pixels
uniform float uDarkness;  // 0..1
uniform vec3 uColor;

float roundedRectSdf(vec2 p, vec2 center, vec2 halfSize, float radius) {
    vec2 q = abs(p - center) - (halfSize - vec2(radius));
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);
    vec2 p = outFragCoord * uResolution;

    vec2 center = vec2(
        uRect.x + uRect.z * 0.5,
        uRect.y + uRect.w * 0.5
    );

    vec2 halfSize = vec2(
        uRect.z * 0.5,
        uRect.w * 0.5
    );

    float dist = roundedRectSdf(p, center, halfSize, uFeather * 0.5);

    float border = smoothstep(
        -uFeather * 0.5,
         uFeather * 0.5,
         dist - 0.5
    );

    vec3 finalColor = mix(color.rgb, uColor, border * uDarkness);

    gl_FragColor = vec4(finalColor, color.a);
}
`;

export class DarkenOutsideAreaController extends Phaser.Filters.Controller {
    private _rect = new Phaser.Math.Vector4(0, 0, 0, 0);
    private _feather = 24;
    private _darkness = 0.6;
    private _color = new Phaser.Display.Color(0, 0, 0);
    private _zoom = 1;

    constructor(camera: Phaser.Cameras.Scene2D.Camera) {
        super(camera, DarkenOutsideAreaFilterName);
    }

    setScreenRect(x: number, y: number, w: number, h: number): this {
        this._rect.set(x, y, w, h);
        return this;
    }

    setFeather(pixels: number): this {
        this._feather = pixels;
        return this;
    }

    setZoomLevel(zoom: number): this {
        this._zoom = zoom;
        return this;
    }

    setDarkness(intensity01: number): this {
        this._darkness = Phaser.Math.Clamp(intensity01, 0, 1);
        return this;
    }

    setColor(color: Phaser.Display.Color): this {
        this._color = color;
        return this;
    }

    get rect(): Phaser.Math.Vector4 {
        return this._rect;
    }

    get feather(): number {
        return this._feather;
    }

    get featherWithZoom(): number {
        return this._feather * this._zoom;
    }

    get darkness(): number {
        return this._darkness;
    }

    get color(): Phaser.Display.Color {
        return this._color;
    }
}

export class DarkenOutsideAreaRenderNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
    constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
        super(DarkenOutsideAreaFilterName, manager, undefined, FRAG_SHADER);
    }

    setupUniforms(controller: DarkenOutsideAreaController, drawingContext: Phaser.Renderer.WebGL.DrawingContext): void {
        const rect = controller.rect;
        const color = controller.color;

        this.programManager.setUniform("uRect", [rect.x, rect.y, rect.z, rect.w]);

        this.programManager.setUniform("uFeather", controller.featherWithZoom);
        this.programManager.setUniform("uDarkness", controller.darkness);
        this.programManager.setUniform("uResolution", [drawingContext.width, drawingContext.height]);

        this.programManager.setUniform("uColor", [color.redGL, color.greenGL, color.blueGL]);
    }
}
