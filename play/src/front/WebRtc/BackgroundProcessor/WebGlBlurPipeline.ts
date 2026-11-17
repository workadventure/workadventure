export type WebGlBlurContext = WebGLRenderingContext | WebGL2RenderingContext;

const WEBGL_BLUR_BASE_MAX_SIDE = 384;
const WEBGL_MIN_BLUR_MAX_SIDE = 288;
const DUAL_KAWASE_MIN_SIDE = 24;

// Joint bilateral range term (adapted from Puter Meetings' compositor, MIT): how far a mask tap's colour may sit
// from the pixel being shaded (euclidean RGB distance) before the tap is rejected. Tighter snaps the edge harder,
// but a person dressed like their background loses their outline.
const JBU_RANGE_SIGMA = 0.2;
// Radius, in mask texels, of the wide spatial blur of the mask that drives light wrapping: a rim, not a glow.
const WRAP_SPREAD = 2.5;
// Strength of the light wrap, image backgrounds only: a blurred background is already the scene's own light.
const REPLACE_LIGHT_WRAP = 0.3;

const FOREGROUND_ALPHA_GLSL = `
float foregroundAlpha(float confidence) {
    return smoothstep(0.24, 0.62, confidence);
}
`;

type WebGlCanvas = HTMLCanvasElement | OffscreenCanvas;

type WebGlStateSnapshot = {
    blendEnabled: boolean;
    depthTestEnabled: boolean;
};

type FramebufferTexture = {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
    width: number;
    height: number;
};

type ProgramLocations = {
    program: WebGLProgram;
    position: number;
    texCoord: number;
    uniforms: Record<string, WebGLUniformLocation>;
};

export function getWebGlBlurSize(
    width: number,
    height: number,
    blurAmount: number,
): { width: number; height: number; scale: number } {
    const normalizedBlurAmount = clamp(blurAmount, 0, 50);
    const maxRenderSide = Math.max(WEBGL_MIN_BLUR_MAX_SIDE, WEBGL_BLUR_BASE_MAX_SIDE - normalizedBlurAmount * 1.4);
    const maxSide = Math.max(width, height);

    if (maxSide <= 0) {
        return { width: 0, height: 0, scale: 0 };
    }

    const scale = Math.min(1, maxRenderSide / maxSide);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
        scale,
    };
}

export function getDualKawaseBlurLevels(blurAmount: number): number {
    const normalizedBlurAmount = clamp(blurAmount, 0, 50);
    if (normalizedBlurAmount <= 10) {
        return 2;
    }
    if (normalizedBlurAmount <= 25) {
        return 3;
    }
    return 4;
}

export function getDualKawaseBlurOffset(blurAmount: number): number {
    const normalizedBlurAmount = clamp(blurAmount, 0, 50);
    if (normalizedBlurAmount <= 10) {
        return 0.4 + normalizedBlurAmount * 0.015;
    }
    if (normalizedBlurAmount <= 25) {
        return 0.55 + (normalizedBlurAmount - 10) * 0.015;
    }
    return 0.775 + (normalizedBlurAmount - 25) * 0.009;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function getNextKawaseSize(width: number, height: number): { width: number; height: number } {
    const nextWidth = Math.max(1, Math.round(width / 2));
    const nextHeight = Math.max(1, Math.round(height / 2));
    const smallestSide = Math.min(nextWidth, nextHeight);

    if (smallestSide >= DUAL_KAWASE_MIN_SIDE) {
        return { width: nextWidth, height: nextHeight };
    }

    const scale = DUAL_KAWASE_MIN_SIDE / Math.max(1, smallestSide);
    return {
        width: Math.max(DUAL_KAWASE_MIN_SIDE, Math.round(nextWidth * scale)),
        height: Math.max(DUAL_KAWASE_MIN_SIDE, Math.round(nextHeight * scale)),
    };
}

export const BLUR_VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

/**
 * With the person mask bound to u_maskTexture (first pass), every tap is premultiplied by 1 - person alpha, so the
 * whole blur chain averages background pixels only and carries their weight in alpha. With an all-zero mask
 * (later passes) it is a plain downsample.
 */
const DUAL_KAWASE_DOWN_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform sampler2D u_maskTexture;
uniform vec2 u_texelSize;
uniform float u_offset;

varying vec2 v_texCoord;
${FOREGROUND_ALPHA_GLSL}
vec4 readBackground(vec2 texCoord) {
    return texture2D(u_texture, texCoord) * (1.0 - foregroundAlpha(texture2D(u_maskTexture, texCoord).r));
}

void main() {
    vec2 offset = u_texelSize * u_offset;
    vec4 color = readBackground(v_texCoord) * 4.0;

    color += readBackground(v_texCoord + vec2(-offset.x, -offset.y));
    color += readBackground(v_texCoord + vec2( offset.x, -offset.y));
    color += readBackground(v_texCoord + vec2(-offset.x,  offset.y));
    color += readBackground(v_texCoord + vec2( offset.x,  offset.y));

    gl_FragColor = color * 0.125;
}
`;

const DUAL_KAWASE_UP_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_offset;

varying vec2 v_texCoord;

void main() {
    vec2 offset = u_texelSize * u_offset;
    vec4 color = vec4(0.0);

    color += texture2D(u_texture, v_texCoord + vec2(-offset.x * 2.0, 0.0));
    color += texture2D(u_texture, v_texCoord + vec2(-offset.x,  offset.y)) * 2.0;
    color += texture2D(u_texture, v_texCoord + vec2(0.0,  offset.y * 2.0));
    color += texture2D(u_texture, v_texCoord + vec2( offset.x,  offset.y)) * 2.0;
    color += texture2D(u_texture, v_texCoord + vec2( offset.x * 2.0, 0.0));
    color += texture2D(u_texture, v_texCoord + vec2( offset.x, -offset.y)) * 2.0;
    color += texture2D(u_texture, v_texCoord + vec2(0.0, -offset.y * 2.0));
    color += texture2D(u_texture, v_texCoord + vec2(-offset.x, -offset.y)) * 2.0;

    gl_FragColor = color / 12.0;
}
`;

/**
 * Blends the raw confidence mask with the previous frame's smoothed mask.
 * Where the two disagree strongly something moved and the fresh mask wins, so motion stays crisp;
 * where they agree the blend dampens the per-frame jitter of a static edge.
 * Spatial filtering is left to the composite's joint bilateral upsample.
 */
export const MASK_SMOOTH_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_maskTexture;
uniform sampler2D u_previousMaskTexture;
uniform float u_previousWeight;

varying vec2 v_texCoord;

void main() {
    float confidence = texture2D(u_maskTexture, v_texCoord).r;
    float previous = texture2D(u_previousMaskTexture, v_texCoord).r;
    float disagreement = abs(confidence - previous);
    float freshWeight = clamp(0.3 + disagreement * 2.5, 0.3, 1.0);
    float smoothed = mix(previous, confidence, max(freshWeight, 1.0 - u_previousWeight));

    gl_FragColor = vec4(smoothed, 0.0, 0.0, 1.0);
}
`;

/**
 * Joint bilateral upsample of the low-res mask, guided by the full-res frame (the technique of Google Meet, ported
 * from Puter Meetings' compositor, MIT): each mask tap is weighted by distance and by how close the frame colour at
 * the tap is to the pixel being shaded, so the alpha edge lands on the real image edge instead of the mask grid.
 *
 * Blur mode: the background is premultiplied by 1 - person alpha (see DUAL_KAWASE_DOWN_FRAGMENT_SHADER); dividing
 * the weight back out gives a blur of the background alone, so the person never smears into it.
 * Replace mode: a light wrap screens a little of the background over the person just inside their outline.
 */
export const COMPOSITE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_sharpTexture;
uniform sampler2D u_backgroundTexture;
uniform sampler2D u_maskTexture;
uniform vec2 u_maskTexelSize;
uniform float u_rangeFalloff;
uniform float u_premultipliedBackground;
uniform float u_lightWrap;

varying vec2 v_texCoord;
${FOREGROUND_ALPHA_GLSL}
void main() {
    vec3 foreground = texture2D(u_sharpTexture, v_texCoord).rgb;

    float confidence = 0.0;
    float weightSum = 0.0;
    float wide = 0.0;
    float wideSum = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 d = vec2(float(x), float(y));
            float spatial = exp(-0.5 * dot(d, d));
            vec2 tap = v_texCoord + d * u_maskTexelSize;
            // The guide is the full-res frame itself: its colour at the tap stands for the mask texel there.
            vec3 colorDistance = texture2D(u_sharpTexture, tap).rgb - foreground;
            float weight = spatial * exp(-dot(colorDistance, colorDistance) * u_rangeFalloff);
            confidence += texture2D(u_maskTexture, tap).r * weight;
            weightSum += weight;
            if (u_lightWrap > 0.0) {
                wide += texture2D(u_maskTexture, v_texCoord + d * u_maskTexelSize * ${WRAP_SPREAD.toFixed(1)}).r * spatial;
                wideSum += spatial;
            }
        }
    }
    // The centre tap always weighs 1, so weightSum never reaches 0.
    float alpha = foregroundAlpha(confidence / weightSum);

    vec4 background = texture2D(u_backgroundTexture, v_texCoord);
    if (u_premultipliedBackground > 0.5) {
        // Where no background survived the blur (a hole in the mask deep inside the person) the small prior pulls
        // the colour towards the sharp frame instead of black.
        background.rgb = clamp((background.rgb + foreground * 0.01) / (background.a + 0.01), 0.0, 1.0);
    }

    if (u_lightWrap > 0.0) {
        // Peaks just inside the outline and dies off deeper in. Screened, so a bright background can't blow out skin.
        float wrap = u_lightWrap * alpha * (1.0 - foregroundAlpha(wide / wideSum));
        foreground = 1.0 - (1.0 - foreground) * (1.0 - background.rgb * wrap);
    }

    gl_FragColor = vec4(mix(background.rgb, foreground, alpha), 1.0);
}
`;

/**
 * WebGL compositing of a camera frame with a segmentation mask, on a context shared with MediaPipe.
 *
 * Blur mode: Dual Kawase blur of the frame at a reduced size, composited under the sharp frame.
 * Replace mode: same composite with a background image instead of the blurred frame.
 * Both modes run the mask through MASK_SMOOTH_FRAGMENT_SHADER, whose output is kept in a ping-pong
 * framebuffer so the next frame can blend against it.
 */
export class WebGlBlurPipeline {
    private downsample: ProgramLocations | null = null;
    private upsample: ProgramLocations | null = null;
    private maskSmooth: ProgramLocations | null = null;
    private composite: ProgramLocations | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private internalTexCoordBuffer: WebGLBuffer | null = null;
    private sourceTexture: WebGLTexture | null = null;
    private backgroundTexture: WebGLTexture | null = null;
    private backgroundSource: CanvasImageSource | null = null;
    private blackTexture: WebGLTexture | null = null;
    private finalBlurFramebuffer: FramebufferTexture | null = null;
    private kawaseFramebuffers: FramebufferTexture[] = [];
    private framebufferWidth = 0;
    private framebufferHeight = 0;
    private framebufferLevels = 0;
    private maskFramebuffers: FramebufferTexture[] = [];
    private currentMaskIndex = 0;
    private hasPreviousMask = false;
    private contextLost = false;

    private readonly canvas: WebGlCanvas;
    private readonly gl: WebGlBlurContext;

    constructor(options: { canvas: WebGlCanvas; gl: WebGlBlurContext }) {
        this.canvas = options.canvas;
        this.gl = options.gl;
    }

    /**
     * @param freshMask false when maskTexture is the same mask as the previous call (segmentation is skipped on
     * some frames): the smoothed mask of the previous call is reused instead of being blended again.
     */
    public drawBlur(
        source: CanvasImageSource,
        maskTexture: WebGLTexture,
        width: number,
        height: number,
        blurAmount: number,
        freshMask: boolean,
    ): boolean {
        if (this.isUnavailable()) {
            return false;
        }
        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return false;
        }

        return this.withStateRestore(() => {
            const blurLevels = getDualKawaseBlurLevels(blurAmount);
            this.ensurePrograms();
            this.ensureBuffers();
            this.ensureBlurFramebuffers(blurSize.width, blurSize.height, blurLevels);

            const smoothedMask = this.smoothMask(maskTexture, width, height, freshMask);
            const blurredTexture = this.renderBlurredTexture(
                source,
                smoothedMask,
                blurSize,
                blurLevels,
                getDualKawaseBlurOffset(blurAmount),
            );
            this.drawCompositePass(this.sourceTexture!, blurredTexture, smoothedMask, width, height, true, 0);
            this.gl.flush();
            return true;
        });
    }

    public drawReplace(
        source: CanvasImageSource,
        maskTexture: WebGLTexture,
        background: CanvasImageSource | null,
        width: number,
        height: number,
        freshMask: boolean,
    ): boolean {
        if (this.isUnavailable() || !width || !height) {
            return false;
        }

        return this.withStateRestore(() => {
            this.ensurePrograms();
            this.ensureBuffers();
            this.ensureSourceTexture();

            const smoothedMask = this.smoothMask(maskTexture, width, height, freshMask);
            this.uploadTexture(this.sourceTexture!, source, 0);
            this.drawCompositePass(
                this.sourceTexture!,
                this.getBackgroundTexture(background),
                smoothedMask,
                width,
                height,
                false,
                background ? REPLACE_LIGHT_WRAP : 0,
            );
            this.gl.flush();
            return true;
        });
    }

    public close(): void {
        this.releaseResources();
    }

    private isUnavailable(): boolean {
        if (this.contextLost || this.gl.isContextLost()) {
            this.contextLost = true;
            return true;
        }
        return false;
    }

    private withStateRestore<T>(callback: () => T): T {
        const snapshot = this.captureState();
        try {
            return callback();
        } finally {
            this.restoreCapturedState(snapshot);
        }
    }

    private captureState(): WebGlStateSnapshot {
        const gl = this.gl;

        // Only the BLEND/DEPTH_TEST enable bits are read back: gl.isEnabled is a
        // cheap client-side query, whereas the binding getters (FRAMEBUFFER_BINDING,
        // CURRENT_PROGRAM, TEXTURE_BINDING_2D, VIEWPORT, ...) force a driver
        // round-trip every frame. Those bindings are reset to neutral defaults in
        // restoreCapturedState() instead of being captured and replayed.
        return {
            blendEnabled: gl.isEnabled(gl.BLEND),
            depthTestEnabled: gl.isEnabled(gl.DEPTH_TEST),
        };
    }

    private restoreCapturedState(snapshot: WebGlStateSnapshot): void {
        const gl = this.gl;

        if (gl.isContextLost()) {
            this.contextLost = true;
            return;
        }

        // Reset the state this pipeline mutates back to a clean baseline rather than
        // reading the previous values back each frame. MediaPipe (the only other
        // consumer of this shared context) re-specifies its own program, buffers,
        // textures and viewport before every draw, so neutral defaults are enough.
        for (let unit = 0; unit < 3; unit++) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        // BLEND/DEPTH_TEST are restored to their captured values since MediaPipe may
        // rely on its own enable state persisting across our draw.
        if (snapshot.blendEnabled) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }

        if (snapshot.depthTestEnabled) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
    }

    private ensurePrograms(): void {
        this.downsample ??= this.createProgram(DUAL_KAWASE_DOWN_FRAGMENT_SHADER, "dual kawase down", [
            "u_texture",
            "u_maskTexture",
            "u_texelSize",
            "u_offset",
        ]);
        this.upsample ??= this.createProgram(DUAL_KAWASE_UP_FRAGMENT_SHADER, "dual kawase up", [
            "u_texture",
            "u_texelSize",
            "u_offset",
        ]);
        this.maskSmooth ??= this.createProgram(MASK_SMOOTH_FRAGMENT_SHADER, "mask smoothing", [
            "u_maskTexture",
            "u_previousMaskTexture",
            "u_previousWeight",
        ]);
        this.composite ??= this.createProgram(COMPOSITE_FRAGMENT_SHADER, "composite", [
            "u_sharpTexture",
            "u_backgroundTexture",
            "u_maskTexture",
            "u_maskTexelSize",
            "u_rangeFalloff",
            "u_premultipliedBackground",
            "u_lightWrap",
        ]);
    }

    private createProgram(fragmentSource: string, label: string, uniformNames: string[]): ProgramLocations {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, BLUR_VERTEX_SHADER, label);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource, label);
        const program = gl.createProgram();

        if (!program) {
            throw new Error(`Unable to create WebGL ${label} program`);
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const message = gl.getProgramInfoLog(program) ?? `Unknown WebGL ${label} program link error`;
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            throw new Error(message);
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        const locations: ProgramLocations = {
            program,
            position: gl.getAttribLocation(program, "a_position"),
            texCoord: gl.getAttribLocation(program, "a_texCoord"),
            uniforms: {},
        };
        for (const name of uniformNames) {
            const location = gl.getUniformLocation(program, name);
            if (!location) {
                throw new Error(`Unable to resolve WebGL ${label} shader uniform ${name}`);
            }
            locations.uniforms[name] = location;
        }
        if (locations.position < 0 || locations.texCoord < 0) {
            throw new Error(`Unable to resolve WebGL ${label} shader attributes`);
        }
        return locations;
    }

    private createShader(type: number, source: string, label: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error(`Unable to create WebGL ${label} shader`);
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(shader) ?? `Unknown WebGL ${label} shader compile error`;
            gl.deleteShader(shader);
            throw new Error(message);
        }

        return shader;
    }

    private ensureBuffers(): void {
        if (this.positionBuffer && this.texCoordBuffer && this.internalTexCoordBuffer) {
            return;
        }

        this.positionBuffer = this.createBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        // Flipped: sampling an uploaded image (or the mask) while drawing to the canvas.
        this.texCoordBuffer = this.createBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]));
        // Identity: framebuffer-to-framebuffer passes.
        this.internalTexCoordBuffer = this.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
    }

    private createBuffer(data: Float32Array): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error("Unable to create WebGL blur buffer");
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    private ensureSourceTexture(): void {
        this.sourceTexture ??= this.createTexture();
    }

    private ensureBlurFramebuffers(width: number, height: number, levels: number): void {
        this.ensureSourceTexture();

        if (
            this.kawaseFramebuffers.length === levels &&
            this.finalBlurFramebuffer &&
            this.framebufferWidth === width &&
            this.framebufferHeight === height &&
            this.framebufferLevels === levels
        ) {
            return;
        }

        this.releaseBlurFramebuffers();
        this.finalBlurFramebuffer = this.createFramebufferTexture(width, height);

        let framebufferWidth = width;
        let framebufferHeight = height;
        for (let level = 0; level < levels; level++) {
            const nextSize = getNextKawaseSize(framebufferWidth, framebufferHeight);
            framebufferWidth = nextSize.width;
            framebufferHeight = nextSize.height;
            this.kawaseFramebuffers.push(this.createFramebufferTexture(framebufferWidth, framebufferHeight));
        }

        this.framebufferWidth = width;
        this.framebufferHeight = height;
        this.framebufferLevels = levels;
    }

    /**
     * Two mask framebuffers at a reduced size (the model outputs 256x256 anyway) that alternate between
     * "previous" and "current" so the temporal blend never reads the texture it writes.
     */
    private ensureMaskFramebuffers(width: number, height: number): void {
        const [current] = this.maskFramebuffers;
        if (current && current.width === width && current.height === height) {
            return;
        }
        this.releaseMaskFramebuffers();
        this.maskFramebuffers = [
            this.createFramebufferTexture(width, height),
            this.createFramebufferTexture(width, height),
        ];
        this.currentMaskIndex = 0;
        this.hasPreviousMask = false;
    }

    private createTexture(): WebGLTexture {
        const gl = this.gl;
        const texture = gl.createTexture();
        if (!texture) {
            throw new Error("Unable to create WebGL blur texture");
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return texture;
    }

    private createFramebufferTexture(width: number, height: number): FramebufferTexture {
        const gl = this.gl;
        const texture = this.createTexture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            gl.deleteTexture(texture);
            throw new Error("Unable to create WebGL blur framebuffer");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteTexture(texture);
            gl.deleteFramebuffer(framebuffer);
            throw new Error("WebGL blur framebuffer is incomplete");
        }

        return { texture, framebuffer, width, height };
    }

    private uploadTexture(texture: WebGLTexture, source: CanvasImageSource, textureUnit: number): void {
        const gl = this.gl;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Texture parameters are already set once in createTexture() and persist on
        // the texture object, so there is no need to re-apply them on every upload.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    }

    /** The background image is uploaded once and reused until the caller hands over a different object. */
    private getBackgroundTexture(background: CanvasImageSource | null): WebGLTexture {
        if (!background) {
            return this.getBlackTexture();
        }
        this.backgroundTexture ??= this.createTexture();
        if (this.backgroundSource !== background) {
            this.uploadTexture(this.backgroundTexture, background, 1);
            this.backgroundSource = background;
        }
        return this.backgroundTexture;
    }

    /** Also stands for an all-zero mask: the downsample passes after the first one premultiply by nothing. */
    private getBlackTexture(): WebGLTexture {
        if (!this.blackTexture) {
            const gl = this.gl;
            this.blackTexture = this.createTexture();
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 255]),
            );
        }
        return this.blackTexture;
    }

    private smoothMask(maskTexture: WebGLTexture, width: number, height: number, freshMask: boolean): WebGLTexture {
        const maskSize = getWebGlBlurSize(width, height, 0);
        this.ensureMaskFramebuffers(maskSize.width, maskSize.height);
        const previous = this.maskFramebuffers[this.currentMaskIndex];
        if (!freshMask && this.hasPreviousMask) {
            return previous.texture;
        }
        const target = this.maskFramebuffers[1 - this.currentMaskIndex];

        const gl = this.gl;
        const program = this.maskSmooth!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program.program);
        this.bindQuad(program, this.internalTexCoordBuffer);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.uniform1i(program.uniforms.u_maskTexture, 0);
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, previous.texture);
        gl.uniform1i(program.uniforms.u_previousMaskTexture, 1);
        gl.uniform1f(program.uniforms.u_previousWeight, this.hasPreviousMask ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.currentMaskIndex = 1 - this.currentMaskIndex;
        this.hasPreviousMask = true;
        return target.texture;
    }

    private renderBlurredTexture(
        source: CanvasImageSource,
        personMask: WebGLTexture,
        blurSize: { width: number; height: number; scale: number },
        levels: number,
        blurOffset: number,
    ): WebGLTexture {
        const gl = this.gl;

        gl.viewport(0, 0, blurSize.width, blurSize.height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 1);
        this.uploadTexture(this.sourceTexture!, source, 0);

        let sourceTexture = this.sourceTexture!;
        let sourceWidth = blurSize.width;
        let sourceHeight = blurSize.height;

        for (let level = 0; level < levels; level++) {
            const target = this.kawaseFramebuffers[level];
            gl.activeTexture(gl.TEXTURE0 + 1);
            gl.bindTexture(gl.TEXTURE_2D, level === 0 ? personMask : this.getBlackTexture());
            gl.useProgram(this.downsample!.program);
            gl.uniform1i(this.downsample!.uniforms.u_maskTexture, 1);
            this.drawKawasePass(this.downsample!, sourceTexture, target, sourceWidth, sourceHeight, blurOffset);
            sourceTexture = target.texture;
            sourceWidth = target.width;
            sourceHeight = target.height;
        }

        for (let level = levels - 2; level >= 0; level--) {
            const target = this.kawaseFramebuffers[level];
            this.drawKawasePass(this.upsample!, sourceTexture, target, sourceWidth, sourceHeight, blurOffset);
            sourceTexture = target.texture;
            sourceWidth = target.width;
            sourceHeight = target.height;
        }

        const target = this.finalBlurFramebuffer!;
        this.drawKawasePass(this.upsample!, sourceTexture, target, sourceWidth, sourceHeight, blurOffset);
        return target.texture;
    }

    private drawKawasePass(
        program: ProgramLocations,
        texture: WebGLTexture,
        target: FramebufferTexture,
        sourceWidth: number,
        sourceHeight: number,
        offset: number,
    ): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program.program);
        this.bindQuad(program, this.internalTexCoordBuffer);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniforms.u_texture, 0);
        gl.uniform2f(program.uniforms.u_texelSize, 1 / sourceWidth, 1 / sourceHeight);
        gl.uniform1f(program.uniforms.u_offset, offset);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private drawCompositePass(
        sharpTexture: WebGLTexture,
        backgroundTexture: WebGLTexture,
        maskTexture: WebGLTexture,
        width: number,
        height: number,
        premultipliedBackground: boolean,
        lightWrap: number,
    ): void {
        const gl = this.gl;
        const program = this.composite!;
        const [mask] = this.maskFramebuffers;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program.program);
        this.bindQuad(program, this.texCoordBuffer);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sharpTexture);
        gl.uniform1i(program.uniforms.u_sharpTexture, 0);

        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
        gl.uniform1i(program.uniforms.u_backgroundTexture, 1);

        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.uniform1i(program.uniforms.u_maskTexture, 2);

        gl.uniform2f(program.uniforms.u_maskTexelSize, 1 / mask.width, 1 / mask.height);
        gl.uniform1f(program.uniforms.u_rangeFalloff, 1 / (2 * JBU_RANGE_SIGMA * JBU_RANGE_SIGMA));
        gl.uniform1f(program.uniforms.u_premultipliedBackground, premultipliedBackground ? 1 : 0);
        gl.uniform1f(program.uniforms.u_lightWrap, lightWrap);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private bindQuad(program: ProgramLocations, texCoordBuffer: WebGLBuffer | null): void {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(program.position);
        gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.enableVertexAttribArray(program.texCoord);
        gl.vertexAttribPointer(program.texCoord, 2, gl.FLOAT, false, 0, 0);
    }

    private releaseResources(): void {
        const gl = this.gl;
        if (!gl.isContextLost()) {
            for (const program of [this.downsample, this.upsample, this.maskSmooth, this.composite]) {
                if (program) {
                    gl.deleteProgram(program.program);
                }
            }
            for (const buffer of [this.positionBuffer, this.texCoordBuffer, this.internalTexCoordBuffer]) {
                if (buffer) {
                    gl.deleteBuffer(buffer);
                }
            }
            for (const texture of [this.sourceTexture, this.backgroundTexture, this.blackTexture]) {
                if (texture) {
                    gl.deleteTexture(texture);
                }
            }
            this.releaseBlurFramebuffers();
            this.releaseMaskFramebuffers();
        }

        this.downsample = null;
        this.upsample = null;
        this.maskSmooth = null;
        this.composite = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.internalTexCoordBuffer = null;
        this.sourceTexture = null;
        this.backgroundTexture = null;
        this.backgroundSource = null;
        this.blackTexture = null;
        this.finalBlurFramebuffer = null;
        this.kawaseFramebuffers = [];
        this.maskFramebuffers = [];
        this.hasPreviousMask = false;
        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
        this.framebufferLevels = 0;
    }

    private releaseFramebufferTextures(framebuffers: FramebufferTexture[]): void {
        if (this.gl.isContextLost()) {
            return;
        }
        for (const framebuffer of framebuffers) {
            this.gl.deleteTexture(framebuffer.texture);
            this.gl.deleteFramebuffer(framebuffer.framebuffer);
        }
    }

    private releaseBlurFramebuffers(): void {
        this.releaseFramebufferTextures(
            this.finalBlurFramebuffer
                ? [this.finalBlurFramebuffer, ...this.kawaseFramebuffers]
                : this.kawaseFramebuffers,
        );
        this.finalBlurFramebuffer = null;
        this.kawaseFramebuffers = [];
        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
        this.framebufferLevels = 0;
    }

    private releaseMaskFramebuffers(): void {
        this.releaseFramebufferTextures(this.maskFramebuffers);
        this.maskFramebuffers = [];
        this.hasPreviousMask = false;
    }
}
