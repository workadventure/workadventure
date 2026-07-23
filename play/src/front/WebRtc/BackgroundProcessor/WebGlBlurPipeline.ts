export type WebGlBlurContext = WebGLRenderingContext | WebGL2RenderingContext;

export const BLUR_ITERATIONS = 2;

const WEBGL_BLUR_BASE_MAX_SIDE = 384;
const WEBGL_MIN_BLUR_MAX_SIDE = 288;
const WEBGL_BLUR_MAX_RADIUS = 18;
const DUAL_KAWASE_MIN_SIDE = 24;

type WebGlCanvas = HTMLCanvasElement | OffscreenCanvas;

type WebGlBlurPipelineOptions<TCanvas extends WebGlCanvas> = {
    canvas: TCanvas;
    gl: WebGlBlurContext;
    ownsContext?: boolean;
    restoreState?: boolean;
};

type WebGlStateSnapshot = {
    blendEnabled: boolean;
    depthTestEnabled: boolean;
};

type KawaseFramebuffer = {
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
    width: number;
    height: number;
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

export function getWebGlBlurRadius(blurAmount: number, scale: number): number {
    if (blurAmount <= 0 || scale <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(WEBGL_BLUR_MAX_RADIUS, Math.round(blurAmount * scale * 1.1)));
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

export const BLUR_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_texelOffset;
uniform float u_radius;

varying vec2 v_texCoord;

void main() {
    float centerWeight = max(u_radius + 1.0, 1.0);
    vec4 color = texture2D(u_texture, v_texCoord) * centerWeight;
    float weight = centerWeight;

    for (int i = 1; i <= 18; i++) {
        float sampleOffset = float(i);
        float enabled = step(sampleOffset, u_radius);
        float sampleWeight = (u_radius + 1.0 - sampleOffset) * enabled;
        vec2 offset = u_texelOffset * sampleOffset;
        color += texture2D(u_texture, v_texCoord + offset) * sampleWeight;
        color += texture2D(u_texture, v_texCoord - offset) * sampleWeight;
        weight += sampleWeight * 2.0;
    }

    gl_FragColor = color / weight;
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

export const COMPOSITE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_sharpTexture;
uniform sampler2D u_blurredTexture;
uniform sampler2D u_maskTexture;
uniform float u_maskAlphaWeight;
uniform vec2 u_maskTexelSize;

varying vec2 v_texCoord;

float readMask(vec2 texCoord) {
    vec4 maskColor = texture2D(u_maskTexture, texCoord);
    return mix(maskColor.r, maskColor.a, u_maskAlphaWeight);
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

    float foregroundAlpha = smoothstep(0.24, 0.62, confidence);
    vec4 blurredBackground = texture2D(u_blurredTexture, v_texCoord);
    vec4 sharpForeground = texture2D(u_sharpTexture, v_texCoord);

    gl_FragColor = mix(blurredBackground, sharpForeground, foregroundAlpha);
}
`;

export class WebGlBlurPipeline<TCanvas extends WebGlCanvas = HTMLCanvasElement> {
    private downsampleProgram: WebGLProgram | null = null;
    private upsampleProgram: WebGLProgram | null = null;
    private compositeProgram: WebGLProgram | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private internalTexCoordBuffer: WebGLBuffer | null = null;
    private sourceTexture: WebGLTexture | null = null;
    private maskTexture: WebGLTexture | null = null;
    private finalBlurFramebuffer: KawaseFramebuffer | null = null;
    private kawaseFramebuffers: KawaseFramebuffer[] = [];
    private framebufferWidth = 0;
    private framebufferHeight = 0;
    private framebufferLevels = 0;
    private downsamplePositionLocation = -1;
    private downsampleTexCoordLocation = -1;
    private downsampleTextureLocation: WebGLUniformLocation | null = null;
    private downsampleTexelSizeLocation: WebGLUniformLocation | null = null;
    private downsampleOffsetLocation: WebGLUniformLocation | null = null;
    private upsamplePositionLocation = -1;
    private upsampleTexCoordLocation = -1;
    private upsampleTextureLocation: WebGLUniformLocation | null = null;
    private upsampleTexelSizeLocation: WebGLUniformLocation | null = null;
    private upsampleOffsetLocation: WebGLUniformLocation | null = null;
    private compositePositionLocation = -1;
    private compositeTexCoordLocation = -1;
    private sharpTextureLocation: WebGLUniformLocation | null = null;
    private blurredTextureLocation: WebGLUniformLocation | null = null;
    private compositeMaskTextureLocation: WebGLUniformLocation | null = null;
    private maskAlphaWeightLocation: WebGLUniformLocation | null = null;
    private maskTexelSizeLocation: WebGLUniformLocation | null = null;
    private contextLost = false;

    private readonly canvas: TCanvas;
    private readonly gl: WebGlBlurContext;
    private readonly ownsContext: boolean;
    private readonly restoreState: boolean;

    private readonly handleContextLost = (event: Event): void => {
        event.preventDefault();
        this.contextLost = true;
        this.releaseResources();
    };

    private readonly handleContextRestored = (): void => {
        this.contextLost = false;
        this.releaseResources();
    };

    constructor(options: WebGlBlurPipelineOptions<TCanvas>) {
        this.canvas = options.canvas;
        this.gl = options.gl;
        this.ownsContext = options.ownsContext ?? false;
        this.restoreState = options.restoreState ?? false;

        if (this.ownsContext) {
            this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
            this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);
        }
    }

    public drawBlurredImage(
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): TCanvas | null {
        if (this.isUnavailable()) {
            return null;
        }

        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return null;
        }

        if (this.canvas.width !== blurSize.width || this.canvas.height !== blurSize.height) {
            this.canvas.width = blurSize.width;
            this.canvas.height = blurSize.height;
        }

        return this.withOptionalStateRestore(() => {
            const blurLevels = getDualKawaseBlurLevels(blurAmount);
            this.ensureDualKawasePrograms();
            this.ensureBuffers();
            this.ensureTextures(blurSize.width, blurSize.height, blurLevels);

            const blurredTexture = this.renderBlurredTexture(
                source,
                blurSize,
                blurLevels,
                getDualKawaseBlurOffset(blurAmount),
            );
            this.drawKawasePass(
                this.upsampleProgram,
                this.upsamplePositionLocation,
                this.upsampleTexCoordLocation,
                this.upsampleTextureLocation,
                this.upsampleTexelSizeLocation,
                this.upsampleOffsetLocation,
                blurredTexture.texture,
                null,
                blurSize.width,
                blurSize.height,
                blurredTexture.width,
                blurredTexture.height,
                0,
                true,
            );
            this.gl.flush();

            return this.canvas;
        });
    }

    public drawCompositeWithCanvasMask(
        source: CanvasImageSource,
        segmentationMask: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): TCanvas | null {
        if (this.isUnavailable()) {
            return null;
        }

        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return null;
        }

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        return this.withOptionalStateRestore(() => {
            const blurLevels = getDualKawaseBlurLevels(blurAmount);
            this.ensureDualKawasePrograms();
            this.ensureCompositeProgram();
            this.ensureBuffers();
            this.ensureTextures(blurSize.width, blurSize.height, blurLevels);
            this.ensureMaskTexture();

            const blurredTexture = this.renderBlurredTexture(
                source,
                blurSize,
                blurLevels,
                getDualKawaseBlurOffset(blurAmount),
            );
            this.uploadTexture(this.maskTexture!, segmentationMask, 2);
            this.drawCompositePass(this.sourceTexture!, blurredTexture.texture, this.maskTexture!, width, height, 1);
            this.gl.flush();

            return this.canvas;
        });
    }

    public drawCompositeWithTextureMask(
        source: CanvasImageSource,
        maskTexture: WebGLTexture,
        width: number,
        height: number,
        blurAmount: number,
    ): boolean {
        if (this.isUnavailable()) {
            return false;
        }

        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return false;
        }

        return this.withOptionalStateRestore(() => {
            const blurLevels = getDualKawaseBlurLevels(blurAmount);
            this.ensureDualKawasePrograms();
            this.ensureCompositeProgram();
            this.ensureBuffers();
            this.ensureTextures(blurSize.width, blurSize.height, blurLevels);

            const blurredTexture = this.renderBlurredTexture(
                source,
                blurSize,
                blurLevels,
                getDualKawaseBlurOffset(blurAmount),
            );
            this.drawCompositePass(this.sourceTexture!, blurredTexture.texture, maskTexture, width, height, 0);
            this.gl.flush();

            return true;
        });
    }

    public close(): void {
        if (this.ownsContext) {
            this.canvas.removeEventListener("webglcontextlost", this.handleContextLost, false);
            this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored, false);
        }

        this.releaseResources();

        if (this.ownsContext) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
    }

    private isUnavailable(): boolean {
        if (this.contextLost || this.gl.isContextLost()) {
            this.contextLost = true;
            return true;
        }

        return false;
    }

    private withOptionalStateRestore<T>(callback: () => T): T {
        if (!this.restoreState) {
            return callback();
        }

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

    private ensureDualKawasePrograms(): void {
        if (!this.downsampleProgram) {
            const program = this.createProgram(
                BLUR_VERTEX_SHADER,
                DUAL_KAWASE_DOWN_FRAGMENT_SHADER,
                "dual kawase down",
            );
            this.downsampleProgram = program;
            this.downsamplePositionLocation = this.gl.getAttribLocation(program, "a_position");
            this.downsampleTexCoordLocation = this.gl.getAttribLocation(program, "a_texCoord");
            this.downsampleTextureLocation = this.gl.getUniformLocation(program, "u_texture");
            this.downsampleTexelSizeLocation = this.gl.getUniformLocation(program, "u_texelSize");
            this.downsampleOffsetLocation = this.gl.getUniformLocation(program, "u_offset");

            if (
                this.downsamplePositionLocation < 0 ||
                this.downsampleTexCoordLocation < 0 ||
                !this.downsampleTextureLocation ||
                !this.downsampleTexelSizeLocation ||
                !this.downsampleOffsetLocation
            ) {
                throw new Error("Unable to resolve WebGL Dual Kawase downsample shader locations");
            }
        }

        if (!this.upsampleProgram) {
            const program = this.createProgram(BLUR_VERTEX_SHADER, DUAL_KAWASE_UP_FRAGMENT_SHADER, "dual kawase up");
            this.upsampleProgram = program;
            this.upsamplePositionLocation = this.gl.getAttribLocation(program, "a_position");
            this.upsampleTexCoordLocation = this.gl.getAttribLocation(program, "a_texCoord");
            this.upsampleTextureLocation = this.gl.getUniformLocation(program, "u_texture");
            this.upsampleTexelSizeLocation = this.gl.getUniformLocation(program, "u_texelSize");
            this.upsampleOffsetLocation = this.gl.getUniformLocation(program, "u_offset");

            if (
                this.upsamplePositionLocation < 0 ||
                this.upsampleTexCoordLocation < 0 ||
                !this.upsampleTextureLocation ||
                !this.upsampleTexelSizeLocation ||
                !this.upsampleOffsetLocation
            ) {
                throw new Error("Unable to resolve WebGL Dual Kawase upsample shader locations");
            }
        }
    }

    private ensureCompositeProgram(): void {
        if (this.compositeProgram) {
            return;
        }

        const program = this.createProgram(BLUR_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER, "composite");
        this.compositeProgram = program;
        this.compositePositionLocation = this.gl.getAttribLocation(program, "a_position");
        this.compositeTexCoordLocation = this.gl.getAttribLocation(program, "a_texCoord");
        this.sharpTextureLocation = this.gl.getUniformLocation(program, "u_sharpTexture");
        this.blurredTextureLocation = this.gl.getUniformLocation(program, "u_blurredTexture");
        this.compositeMaskTextureLocation = this.gl.getUniformLocation(program, "u_maskTexture");
        this.maskAlphaWeightLocation = this.gl.getUniformLocation(program, "u_maskAlphaWeight");
        this.maskTexelSizeLocation = this.gl.getUniformLocation(program, "u_maskTexelSize");

        if (
            this.compositePositionLocation < 0 ||
            this.compositeTexCoordLocation < 0 ||
            !this.sharpTextureLocation ||
            !this.blurredTextureLocation ||
            !this.compositeMaskTextureLocation ||
            !this.maskAlphaWeightLocation ||
            !this.maskTexelSizeLocation
        ) {
            throw new Error("Unable to resolve WebGL blur composite shader locations");
        }
    }

    private createProgram(vertexSource: string, fragmentSource: string, label: string): WebGLProgram {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource, label);
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

        return program;
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
        this.texCoordBuffer = this.createBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]));
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

    private ensureTextures(width: number, height: number, levels: number): void {
        if (!this.sourceTexture) {
            this.sourceTexture = this.createTexture();
        }

        if (
            this.kawaseFramebuffers.length === levels &&
            this.finalBlurFramebuffer &&
            this.framebufferWidth === width &&
            this.framebufferHeight === height &&
            this.framebufferLevels === levels
        ) {
            return;
        }

        this.releaseFramebufferResources();
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

    private ensureMaskTexture(): void {
        if (!this.maskTexture) {
            this.maskTexture = this.createTexture();
        }
    }

    private createTexture(): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) {
            throw new Error("Unable to create WebGL blur texture");
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.configureTexture();
        return texture;
    }

    private createFramebufferTexture(width: number, height: number): KawaseFramebuffer {
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

    private configureTexture(): void {
        const gl = this.gl;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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

    private renderBlurredTexture(
        source: CanvasImageSource,
        blurSize: { width: number; height: number; scale: number },
        levels: number,
        blurOffset: number,
    ): { texture: WebGLTexture; width: number; height: number } {
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
            this.drawKawasePass(
                this.downsampleProgram,
                this.downsamplePositionLocation,
                this.downsampleTexCoordLocation,
                this.downsampleTextureLocation,
                this.downsampleTexelSizeLocation,
                this.downsampleOffsetLocation,
                sourceTexture,
                target.framebuffer,
                target.width,
                target.height,
                sourceWidth,
                sourceHeight,
                blurOffset,
                false,
            );
            sourceTexture = target.texture;
            sourceWidth = target.width;
            sourceHeight = target.height;
        }

        for (let level = levels - 2; level >= 0; level--) {
            const target = this.kawaseFramebuffers[level];
            this.drawKawasePass(
                this.upsampleProgram,
                this.upsamplePositionLocation,
                this.upsampleTexCoordLocation,
                this.upsampleTextureLocation,
                this.upsampleTexelSizeLocation,
                this.upsampleOffsetLocation,
                sourceTexture,
                target.framebuffer,
                target.width,
                target.height,
                sourceWidth,
                sourceHeight,
                blurOffset,
                false,
            );
            sourceTexture = target.texture;
            sourceWidth = target.width;
            sourceHeight = target.height;
        }

        const target = this.finalBlurFramebuffer!;
        this.drawKawasePass(
            this.upsampleProgram,
            this.upsamplePositionLocation,
            this.upsampleTexCoordLocation,
            this.upsampleTextureLocation,
            this.upsampleTexelSizeLocation,
            this.upsampleOffsetLocation,
            sourceTexture,
            target.framebuffer,
            target.width,
            target.height,
            sourceWidth,
            sourceHeight,
            blurOffset,
            false,
        );

        return { texture: target.texture, width: target.width, height: target.height };
    }

    private drawKawasePass(
        program: WebGLProgram | null,
        positionLocation: number,
        texCoordLocation: number,
        textureLocation: WebGLUniformLocation | null,
        texelSizeLocation: WebGLUniformLocation | null,
        offsetLocation: WebGLUniformLocation | null,
        texture: WebGLTexture,
        framebuffer: WebGLFramebuffer | null,
        targetWidth: number,
        targetHeight: number,
        sourceWidth: number,
        sourceHeight: number,
        offset: number,
        flipVertically: boolean,
    ): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, targetWidth, targetHeight);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, flipVertically ? this.texCoordBuffer : this.internalTexCoordBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocation, 0);
        gl.uniform2f(texelSizeLocation, 1 / sourceWidth, 1 / sourceHeight);
        gl.uniform1f(offsetLocation, offset);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private drawCompositePass(
        sharpTexture: WebGLTexture,
        blurredTexture: WebGLTexture,
        maskTexture: WebGLTexture,
        width: number,
        height: number,
        maskAlphaWeight: number,
    ): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.compositeProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.compositePositionLocation);
        gl.vertexAttribPointer(this.compositePositionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.compositeTexCoordLocation);
        gl.vertexAttribPointer(this.compositeTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sharpTexture);
        gl.uniform1i(this.sharpTextureLocation, 0);

        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, blurredTexture);
        gl.uniform1i(this.blurredTextureLocation, 1);

        gl.activeTexture(gl.TEXTURE0 + 2);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.uniform1i(this.compositeMaskTextureLocation, 2);
        gl.uniform1f(this.maskAlphaWeightLocation, maskAlphaWeight);
        gl.uniform2f(this.maskTexelSizeLocation, 1 / width, 1 / height);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private releaseResources(): void {
        if (this.gl.isContextLost()) {
            this.clearReferences();
            return;
        }

        if (this.downsampleProgram) {
            this.gl.deleteProgram(this.downsampleProgram);
        }
        if (this.upsampleProgram) {
            this.gl.deleteProgram(this.upsampleProgram);
        }
        if (this.compositeProgram) {
            this.gl.deleteProgram(this.compositeProgram);
        }
        if (this.positionBuffer) {
            this.gl.deleteBuffer(this.positionBuffer);
        }
        if (this.texCoordBuffer) {
            this.gl.deleteBuffer(this.texCoordBuffer);
        }
        if (this.internalTexCoordBuffer) {
            this.gl.deleteBuffer(this.internalTexCoordBuffer);
        }
        if (this.sourceTexture) {
            this.gl.deleteTexture(this.sourceTexture);
        }
        if (this.maskTexture) {
            this.gl.deleteTexture(this.maskTexture);
        }

        this.releaseFramebufferResources();
        this.clearReferences();
    }

    private releaseFramebufferResources(): void {
        if (this.gl.isContextLost()) {
            this.finalBlurFramebuffer = null;
            this.kawaseFramebuffers = [];
            this.framebufferWidth = 0;
            this.framebufferHeight = 0;
            this.framebufferLevels = 0;
            return;
        }

        if (this.finalBlurFramebuffer) {
            this.gl.deleteTexture(this.finalBlurFramebuffer.texture);
            this.gl.deleteFramebuffer(this.finalBlurFramebuffer.framebuffer);
            this.finalBlurFramebuffer = null;
        }

        for (const framebuffer of this.kawaseFramebuffers) {
            this.gl.deleteTexture(framebuffer.texture);
            this.gl.deleteFramebuffer(framebuffer.framebuffer);
        }

        this.kawaseFramebuffers = [];
        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
        this.framebufferLevels = 0;
    }

    private clearReferences(): void {
        this.downsampleProgram = null;
        this.upsampleProgram = null;
        this.compositeProgram = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.internalTexCoordBuffer = null;
        this.sourceTexture = null;
        this.maskTexture = null;
        this.finalBlurFramebuffer = null;
        this.kawaseFramebuffers = [];
        this.downsampleTextureLocation = null;
        this.downsampleTexelSizeLocation = null;
        this.downsampleOffsetLocation = null;
        this.upsampleTextureLocation = null;
        this.upsampleTexelSizeLocation = null;
        this.upsampleOffsetLocation = null;
        this.sharpTextureLocation = null;
        this.blurredTextureLocation = null;
        this.compositeMaskTextureLocation = null;
        this.maskAlphaWeightLocation = null;
        this.maskTexelSizeLocation = null;
        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
        this.framebufferLevels = 0;
    }
}
