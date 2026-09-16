export type WebGlBlurContext = WebGLRenderingContext | WebGL2RenderingContext;

const WEBGL_BLUR_BASE_MAX_SIDE = 384;
const WEBGL_MIN_BLUR_MAX_SIDE = 288;
const DUAL_KAWASE_MIN_SIDE = 24;

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

const DUAL_KAWASE_DOWN_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_offset;

varying vec2 v_texCoord;

void main() {
    vec2 offset = u_texelSize * u_offset;
    vec4 color = texture2D(u_texture, v_texCoord) * 4.0;

    color += texture2D(u_texture, v_texCoord + vec2(-offset.x, -offset.y));
    color += texture2D(u_texture, v_texCoord + vec2( offset.x, -offset.y));
    color += texture2D(u_texture, v_texCoord + vec2(-offset.x,  offset.y));
    color += texture2D(u_texture, v_texCoord + vec2( offset.x,  offset.y));

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
 * Feathers the raw confidence mask spatially, then blends it with the previous frame's smoothed mask.
 * Where the two disagree strongly something moved and the fresh mask wins, so motion stays crisp;
 * where they agree the blend dampens the per-frame jitter of a static edge.
 */
export const MASK_SMOOTH_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_maskTexture;
uniform sampler2D u_previousMaskTexture;
uniform vec2 u_maskTexelSize;
uniform float u_previousWeight;

varying vec2 v_texCoord;

float readMask(vec2 texCoord) {
    return texture2D(u_maskTexture, texCoord).r;
}

void main() {
    vec2 featherOffset = u_maskTexelSize * 1.15;
    float confidence = readMask(v_texCoord) * 0.36;
    confidence += readMask(v_texCoord + vec2( featherOffset.x, 0.0)) * 0.1;
    confidence += readMask(v_texCoord + vec2(-featherOffset.x, 0.0)) * 0.1;
    confidence += readMask(v_texCoord + vec2(0.0,  featherOffset.y)) * 0.1;
    confidence += readMask(v_texCoord + vec2(0.0, -featherOffset.y)) * 0.1;
    confidence += readMask(v_texCoord + vec2( featherOffset.x,  featherOffset.y)) * 0.06;
    confidence += readMask(v_texCoord + vec2(-featherOffset.x,  featherOffset.y)) * 0.06;
    confidence += readMask(v_texCoord + vec2( featherOffset.x, -featherOffset.y)) * 0.06;
    confidence += readMask(v_texCoord + vec2(-featherOffset.x, -featherOffset.y)) * 0.06;

    float previous = texture2D(u_previousMaskTexture, v_texCoord).r;
    float disagreement = abs(confidence - previous);
    float freshWeight = clamp(0.3 + disagreement * 2.5, 0.3, 1.0);
    float smoothed = mix(previous, confidence, max(freshWeight, 1.0 - u_previousWeight));

    gl_FragColor = vec4(smoothed, 0.0, 0.0, 1.0);
}
`;

export const COMPOSITE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_sharpTexture;
uniform sampler2D u_backgroundTexture;
uniform sampler2D u_maskTexture;

varying vec2 v_texCoord;

void main() {
    float confidence = texture2D(u_maskTexture, v_texCoord).r;
    float foregroundAlpha = smoothstep(0.24, 0.62, confidence);
    vec4 background = texture2D(u_backgroundTexture, v_texCoord);
    vec4 sharpForeground = texture2D(u_sharpTexture, v_texCoord);

    gl_FragColor = mix(background, sharpForeground, foregroundAlpha);
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
                blurSize,
                blurLevels,
                getDualKawaseBlurOffset(blurAmount),
            );
            this.drawCompositePass(this.sourceTexture!, blurredTexture, smoothedMask, width, height);
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
            "u_maskTexelSize",
            "u_previousWeight",
        ]);
        this.composite ??= this.createProgram(COMPOSITE_FRAGMENT_SHADER, "composite", [
            "u_sharpTexture",
            "u_backgroundTexture",
            "u_maskTexture",
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
        const gl = this.gl;
        if (!background) {
            if (!this.blackTexture) {
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
        this.backgroundTexture ??= this.createTexture();
        if (this.backgroundSource !== background) {
            this.uploadTexture(this.backgroundTexture, background, 1);
            this.backgroundSource = background;
        }
        return this.backgroundTexture;
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
        gl.uniform2f(program.uniforms.u_maskTexelSize, 1 / width, 1 / height);
        gl.uniform1f(program.uniforms.u_previousWeight, this.hasPreviousMask ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.currentMaskIndex = 1 - this.currentMaskIndex;
        this.hasPreviousMask = true;
        return target.texture;
    }

    private renderBlurredTexture(
        source: CanvasImageSource,
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
    ): void {
        const gl = this.gl;
        const program = this.composite!;
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
