import * as Phaser from "phaser";
import type { GameScene } from "../Game/GameScene";
import { DEPTH_CONVERSATION_BUBBLE_INDEX } from "../Game/DepthIndexes";
import { MINIMUM_DISTANCE } from "../../Enum/EnvironmentVariable";
import type { Character } from "./Character";
import { RemotePlayer } from "./RemotePlayer";

/** Number of angular radius samples. MUST match the `SEG` constant in FRAG_SHADER. */
const BUBBLE_SEGMENTS = 64;
/** Max deformation per avatar (px). Also used to size the WebGL render quad. */
const BUBBLE_AMP = 20;

/**
 * Fragment shader that draws the jelly bubble directly on the GPU (WebGL renderer only).
 *
 * The bubble is a closed blob defined by BUBBLE_SEGMENTS radii around its center. That is a radial
 * signed-distance field: for a fragment at distance `r` and angle `θ` from the center, it is "inside"
 * when `r < R(θ)` and on the outline when `|r - R(θ)|` is small. The per-angle radius `R(θ)` is read
 * from a tiny SEGx1 data texture (16-bit radius encoded in the R/G channels) and interpolated with a
 * periodic Catmull-Rom to reproduce the smoothness of the old Catmull-Rom spline.
 *
 * This replaces the previous approach of rasterizing a spline into a brand-new texture every frame
 * (`generateTexture`), which allocated and uploaded a GL texture per bubble per frame. Here the CPU
 * only writes SEG texels; the GPU draws the shape. It is also resolution-independent, so the outline
 * stays crisp at any camera zoom.
 *
 * Note: GLSL ES 1.00 (Phaser 4 runs a WebGL1 context) forbids indexing a uniform array with a
 * non-constant index in a fragment shader, hence the data-texture lookup rather than a
 * `uniform float[SEG]`.
 */
const FRAG_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// 0,1 is the top-left of the quad, 1,0 is the bottom-right (note: y is flipped vs world space).
varying vec2 outTexCoord;

uniform sampler2D uRadii; // SEGx1, 16-bit radius per angle: R = high byte, G = low byte
uniform float uQuadSize;  // world size of the (square) quad
uniform float uMaxR;      // radius encoding range, in world units (radius = n * uMaxR)
uniform float uAA;        // edge feather in world units (~1 screen pixel)
uniform float uLineW;     // outline width, in world units
uniform vec3 uColor;
uniform float uFillAlpha;
uniform float uLineAlpha;

const float SEG = 64.0; // MUST match BUBBLE_SEGMENTS
const float TAU = 6.28318530718;

// Decode the 16-bit radius stored at texture coordinate uv.
float decode(vec2 uv) {
    vec4 t = texture2D(uRadii, uv);
    float n = (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0;
    return n * uMaxR;
}

// Radius sample at angular index (wrapped), read at the texel center (NEAREST filtering).
float radiusAt(float idx) {
    float i = mod(idx, SEG);
    return decode(vec2((i + 0.5) / SEG, 0.5));
}

float catmull(float p0, float p1, float p2, float p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    return 0.5 * (
        (2.0 * p1) +
        (-p0 + p2) * t +
        (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
        (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
    );
}

void main() {
    // World-space offset from the bubble center. outTexCoord.y is flipped (top = 1), so undo it
    // to keep the angle consistent with the CPU-side atan2(dy, dx) used to compute the radii.
    vec2 local = vec2(outTexCoord.x - 0.5, 0.5 - outTexCoord.y) * uQuadSize;
    float r = length(local);

    // Cheap reject for the quad corners that can never be inside the blob.
    if (r > uMaxR + uLineW + uAA) {
        discard;
    }

    float f = fract(atan(local.y, local.x) / TAU) * SEG;
    float i1 = floor(f);
    float frac = f - i1;

    float R = catmull(
        radiusAt(i1 - 1.0),
        radiusAt(i1),
        radiusAt(i1 + 1.0),
        radiusAt(i1 + 2.0),
        frac
    );

    float d = r - R;

    // Fill: solid inside, feathered across the boundary.
    float inside = 1.0 - smoothstep(0.0, uAA, d);
    // Outline: a band of total width uLineW centered on the boundary.
    float lineHalf = uLineW * 0.5;
    float line = 1.0 - smoothstep(lineHalf - uAA, lineHalf + uAA, abs(d));

    float a = inside * uFillAlpha;
    a = mix(a, uLineAlpha, line); // outline drawn over the fill

    if (a <= 0.001) {
        discard;
    }

    // Phaser's shader pipeline blends with premultiplied alpha, so premultiply the colour here
    // (otherwise a translucent fill renders far too opaque).
    gl_FragColor = vec4(uColor * a, a);
}
`;

/** A very small interface for whatever "player" object you use.
 *  Adapt or extend as needed. */
export interface Avatar {
    x: number; // world X
    y: number; // world Y
    inside: boolean; // true ⇢ avatar is already in the conversation
}

// ---------------------------------------------------------------------------
// Rendering strategies
//
// The geometry (radii + center) is computed once in ConversationBubble; only the *drawing* differs
// per renderer. The WebGL strategy draws the blob with a fragment shader (fast, crisp at any zoom).
// The Canvas strategy keeps the legacy spline-into-texture technique, since shaders require WebGL.
// ---------------------------------------------------------------------------

interface BubbleRenderer {
    /** (Re)draw the bubble for the given center, radii and locked state. */
    render(centerX: number, centerY: number, radii: readonly number[], locked: boolean): void;
    /** Release any GPU / texture resources. */
    destroy(): void;
}

/** Draws the bubble on the GPU using a fragment shader fed by a small radius data-texture. */
class WebGLBubbleRenderer implements BubbleRenderer {
    private readonly scene: GameScene;
    private readonly shader: Phaser.GameObjects.Shader;
    private readonly radiusTextureKey: string;
    private readonly radiusTexture: Phaser.Textures.CanvasTexture | null;
    /** Radius encoding range in world units; radii are normalised to [0, 1] against this. */
    private readonly maxR: number;
    private readonly quadSize: number;
    private radii: readonly number[] = [];
    private locked = false;
    private static nextId = 0;

    constructor(scene: GameScene, x: number, y: number) {
        this.scene = scene;

        // Sized so the blob (radius <= R0 + amp*2) plus its outline always fits inside the quad.
        const quadHalf = MINIMUM_DISTANCE + BUBBLE_AMP * 2 + 2;
        this.quadSize = quadHalf * 2;
        this.maxR = quadHalf;

        // One texture per bubble lifetime, updated in place each frame (no per-frame texture churn).
        this.radiusTextureKey = `bubble_radii_${WebGLBubbleRenderer.nextId++}`;
        this.radiusTexture = scene.textures.createCanvas(this.radiusTextureKey, BUBBLE_SEGMENTS, 1);
        this.radiusTexture?.setFilter(Phaser.Textures.FilterMode.NEAREST);

        this.shader = scene.add.shader(
            {
                name: "ConversationBubble",
                shaderName: "ConversationBubble",
                fragmentSource: FRAG_SHADER,
                setupUniforms: (setUniform: (name: string, value: unknown) => void) => this.applyUniforms(setUniform),
            },
            x,
            y,
            this.quadSize,
            this.quadSize,
            [this.radiusTextureKey],
        );
        this.shader.setOrigin(0.5); // quad centered on the bubble center
        this.shader.setDepth(DEPTH_CONVERSATION_BUBBLE_INDEX);
    }

    public render(centerX: number, centerY: number, radii: readonly number[], locked: boolean): void {
        this.radii = radii;
        this.locked = locked;
        this.shader.setPosition(centerX, centerY);
        this.uploadRadii();
    }

    /** Encode the current radii into the SEGx1 data texture and re-upload it to the GPU. */
    private uploadRadii(): void {
        const texture = this.radiusTexture;
        if (!texture) {
            return;
        }

        const imageData = texture.imageData;
        const data = imageData.data;
        const maxR = this.maxR;

        for (let s = 0; s < BUBBLE_SEGMENTS; s++) {
            let n = this.radii[s] / maxR;
            n = n < 0 ? 0 : n > 1 ? 1 : n;
            const encoded = Math.round(n * 65535);
            const i = s * 4;
            data[i] = encoded >> 8; // high byte
            data[i + 1] = encoded & 0xff; // low byte
            data[i + 2] = 0;
            data[i + 3] = 255;
        }

        texture.putData(imageData, 0, 0);
        texture.refresh();
    }

    /** Push per-frame uniforms to the shader. Invoked by Phaser each render. */
    private applyUniforms(setUniform: (name: string, value: unknown) => void): void {
        const zoom = this.scene.cameras.main.zoom || 1;

        setUniform("uRadii", 0); // sampler bound to texture unit 0
        setUniform("uQuadSize", this.quadSize);
        setUniform("uMaxR", this.maxR);
        setUniform("uAA", 1 / zoom); // ~1 screen pixel of feathering, zoom-independent
        setUniform("uLineW", 1); // outline width in world units (matches the old lineStyle(1))
        setUniform("uColor", this.locked ? [1, 0, 0] : [1, 1, 1]);
        setUniform("uFillAlpha", 0.25);
        setUniform("uLineAlpha", this.locked ? 1 : 0.9);
    }

    public destroy(): void {
        if (this.scene.textures.exists(this.radiusTextureKey)) {
            this.scene.textures.remove(this.radiusTextureKey);
        }
        this.shader.destroy();
    }
}

/**
 * Legacy renderer used when Phaser falls back to the Canvas renderer (shaders need WebGL).
 * Builds a Catmull-Rom spline, rasterizes it into a texture and displays it on a Sprite.
 */
class CanvasBubbleRenderer implements BubbleRenderer {
    private readonly scene: GameScene;
    private readonly sprite: Phaser.GameObjects.Sprite;
    private generatedTextureKey: string | null = null;

    constructor(scene: GameScene, x: number, y: number) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, "");
        this.sprite.setDepth(DEPTH_CONVERSATION_BUBBLE_INDEX);
    }

    public render(centerX: number, centerY: number, radii: readonly number[], locked: boolean): void {
        // Convert polar samples to Cartesian points
        const pts: Phaser.Math.Vector2[] = [];
        for (let s = 0; s < BUBBLE_SEGMENTS; s++) {
            const θ = (s / BUBBLE_SEGMENTS) * Math.PI * 2;
            const r = radii[s];
            pts.push(new Phaser.Math.Vector2(centerX + r * Math.cos(θ), centerY + r * Math.sin(θ)));
        }

        // Create a spline and oversample for smoothness
        const spline = new Phaser.Curves.Spline(pts);
        const smooth = spline.getSpacedPoints(BUBBLE_SEGMENTS * 2);

        // Calculate bounding box
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        for (const point of smooth) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        const width = Math.ceil(maxX - minX);
        const height = Math.ceil(maxY - minY);

        // Create temporary graphics object to draw the shape
        const tempGraphics = this.scene.add.graphics();

        // Apply style based on locked status
        if (locked) {
            tempGraphics.fillStyle(0xff0000, 0.25); // solid fill
            tempGraphics.lineStyle(1, 0xff0000, 1); // crisp outline
        } else {
            tempGraphics.fillStyle(0xffffff, 0.25); // semi-transparent fill
            tempGraphics.lineStyle(1, 0xffffff, 0.9); // crisp outline
        }

        // Draw the shape adjusted to (0,0) origin in the texture
        tempGraphics.beginPath();
        tempGraphics.moveTo(smooth[0].x - minX, smooth[0].y - minY);
        for (let i = 1; i < smooth.length; i++) {
            tempGraphics.lineTo(smooth[i].x - minX, smooth[i].y - minY);
        }
        tempGraphics.closePath();
        tempGraphics.fillPath();
        tempGraphics.strokePath();

        // Calculate origin offset to position the sprite correctly
        const originX = (centerX - minX) / width;
        const originY = (centerY - minY) / height;

        // Remove old texture if it exists
        if (this.generatedTextureKey && this.scene.textures.exists(this.generatedTextureKey)) {
            this.scene.textures.remove(this.generatedTextureKey);
        }

        // Generate a new texture key
        this.generatedTextureKey = `bubble_texture_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        // Generate a texture from the graphics
        tempGraphics.generateTexture(this.generatedTextureKey, width, height);

        // Clean up the temporary graphics
        tempGraphics.destroy();

        // Apply the new texture to the sprite
        this.sprite.setPosition(centerX, centerY);
        this.sprite.setTexture(this.generatedTextureKey);
        this.sprite.setOrigin(originX, originY);
    }

    public destroy(): void {
        if (this.generatedTextureKey && this.scene.textures.exists(this.generatedTextureKey)) {
            this.scene.textures.remove(this.generatedTextureKey);
        }
        this.sprite.destroy();
    }
}

/** No-op renderer for headless / bot scenes that have no renderer at all. */
class NoopBubbleRenderer implements BubbleRenderer {
    public render(): void {
        // nothing to draw
    }
    public destroy(): void {
        // nothing to release
    }
}

/** Jelly-like circle that bulges / dimples toward or away from avatars. */
export class ConversationBubble {
    // ==== Tunables =========================================================
    private readonly R0 = MINIMUM_DISTANCE; // resting radius (px)
    private readonly lambda = 40; // fall-off distance for influence (px)
    private readonly kInside = 2; // angular sharpness of the bump from players inside the bubble
    private readonly kOutside = 20; // angular sharpness of the bump from players outside the bubble
    private readonly amp = BUBBLE_AMP; // max deformation per avatar (px)
    private readonly segments = BUBBLE_SEGMENTS; // angular samples (higher = smoother)
    private readonly speed = 0.1; // If set to 1, the bubble size instantly matches the avatars position. Set between 0 and 1 to have a smooth transition.
    private readonly stopAnimationThreshold = 0.1; // As long as one of the radii changes more than this value, the bubble is considered animating.
    private readonly influenceRadius = this.R0 + this.lambda * 2;
    private readonly influenceRadiusSquared = this.influenceRadius * this.influenceRadius;

    // ==== Internal state ===================================================
    private center = new Phaser.Math.Vector2();
    private radii = new Array<number>(this.segments).fill(this.R0);
    private gameScene: GameScene;
    private locked: boolean;
    private userIds: number[];
    private renderer: BubbleRenderer;

    // Whether the bubble is currently wobbling
    private _isAnimating = true;
    private _needsStep = true;

    constructor(scene: GameScene, x: number, y: number, locked: boolean, userIds: number[]) {
        this.gameScene = scene;
        this.center.set(x, y);
        this.locked = locked;
        this.userIds = userIds;

        this.renderer = ConversationBubble.createRenderer(scene, x, y);
        this.renderer.render(x, y, this.radii, locked);
    }

    /** Pick a renderer based on the active Phaser renderer (WebGL shader vs. Canvas sprite). */
    private static createRenderer(scene: GameScene, x: number, y: number): BubbleRenderer {
        const renderer = scene.game.renderer;
        if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            return new WebGLBubbleRenderer(scene, x, y);
        }
        if (renderer instanceof Phaser.Renderer.Canvas.CanvasRenderer) {
            return new CanvasBubbleRenderer(scene, x, y);
        }
        // No renderer (bots / headless): nothing to draw.
        return new NoopBubbleRenderer();
    }

    /** World X of the bubble center (kept for GameScene which reads `group.x`). */
    public get x(): number {
        return this.center.x;
    }

    /** World Y of the bubble center (kept for GameScene which reads `group.y`). */
    public get y(): number {
        return this.center.y;
    }

    public updateUsers(userIds: number[]): void {
        this.userIds = userIds;
        this._needsStep = true;
    }

    public getInfluenceRadius(): number {
        return this.influenceRadius;
    }

    public containsUserId(userId: number): boolean {
        return this.userIds.includes(userId);
    }

    public getUserIds(): readonly number[] {
        return this.userIds;
    }

    public turnInAvatar(character: Character): Avatar | undefined {
        let userId: number;
        if (character instanceof RemotePlayer) {
            userId = character.userId;
        } else {
            // This is the current player
            const currentUserId = this.gameScene.connection?.getUserId();
            if (currentUserId === undefined) {
                console.warn("ConversationBubble: No user ID found for the current player.");
                return undefined; // No user ID available
            }
            userId = currentUserId;
        }

        if (this.userIds.includes(userId)) {
            return {
                x: character.x,
                y: character.y,
                inside: true, // assume all listed players are inside the bubble
            };
        } else {
            // Is the player close enough to be considered?
            const dx = character.x - this.center.x;
            const dy = character.y - this.center.y;
            const dist = dx * dx + dy * dy;
            if (dist < this.influenceRadiusSquared) {
                return {
                    x: character.x,
                    y: character.y,
                    inside: false, // outside the bubble
                };
            }
        }
        return undefined; // not an avatar to be considered
    }

    /** Call once per frame with the avatars that might affect this bubble. */
    public step(avatars: Avatar[]): void {
        this._needsStep = false;
        this._isAnimating = false; // reset animation state
        this.updateCenterFromInsideAvatars(avatars);

        /* --- 1.  Update radius samples ----------------------------------- */
        for (let s = 0; s < this.segments; s++) {
            const θ = (s / this.segments) * Math.PI * 2;
            let targetR = this.R0;

            for (const av of avatars) {
                const dx = av.x - this.center.x;
                const dy = av.y - this.center.y;
                const dist = Math.hypot(dx, dy);
                const φ = Math.atan2(dy, dx);

                // signed distance to the resting boundary
                const dBoundary = dist - this.R0;

                // ±amp depending on whether avatar is inside or out
                const A = av.inside ? +this.amp : -this.amp;

                targetR +=
                    ((A * Math.exp(-Math.abs(dBoundary) / this.lambda) * this.angularFalloff(θ - φ, av.inside)) /
                        avatars.length) *
                    2;
            }

            /* --- 2.  Dampen changes with simple lerp for a jelly feel ---- */
            const newRadius = Phaser.Math.Linear(this.radii[s], targetR, this.speed);
            if (Math.abs(newRadius - this.radii[s]) > this.stopAnimationThreshold) {
                this._isAnimating = true; // mark as animating if there's a significant change
            }
            this.radii[s] = newRadius;
        }

        /* --- 3.  Redraw -------------------------------------------------- */
        this.renderer.render(this.center.x, this.center.y, this.radii, this.locked);
        this.gameScene.markDirty();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Cosine lobe clamped to zero and sharpened by k. */
    private angularFalloff(delta: number, isInside: boolean): number {
        const c = Math.cos(delta);
        return c <= 0 ? 0 : Math.pow(c, isInside ? this.kInside : this.kOutside);
    }

    private updateCenterFromInsideAvatars(avatars: Avatar[]): void {
        let x = 0;
        let y = 0;
        let count = 0;

        for (const avatar of avatars) {
            if (!avatar.inside) {
                continue;
            }

            x += avatar.x;
            y += avatar.y;
            count++;
        }

        if (count === 0) {
            return;
        }

        this.center.set(x / count, y / count);
    }

    // -----------------------------------------------------------------------
    // Optional utilities
    // -----------------------------------------------------------------------

    public setLocked(locked: boolean): void {
        this.locked = locked;
        // Redraw with the new colour and make sure a render happens.
        this.renderer.render(this.center.x, this.center.y, this.radii, this.locked);
        this.gameScene.markDirty();
    }

    /** Clean up resources when destroying the object */
    public destroy(): void {
        this.renderer.destroy();
    }

    public get isAnimating(): boolean {
        return this._isAnimating;
    }

    public get needsStep(): boolean {
        return this._needsStep;
    }
}
