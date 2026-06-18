export type BlurBackend = "webgl-blur" | "cpu-blur" | "none";

const CPU_BLUR_MAX_SIDE = 224;
const CPU_BLUR_ITERATIONS = 2;
const WEBGL_MIN_BLUR_MAX_SIDE = 112;
const WEBGL_BLUR_MAX_RADIUS = 18;

const loggedBackends = new Set<BlurBackend>();
let loggedWebGlFailure = false;
let loggedCpuFailure = false;

export function resetCanvasBlurRendererForTests(): void {
    loggedBackends.clear();
    loggedWebGlFailure = false;
    loggedCpuFailure = false;
}

export function getCpuBlurSize(width: number, height: number): { width: number; height: number; scale: number } {
    return getBlurRenderSize(width, height, CPU_BLUR_MAX_SIDE);
}

function getWebGlBlurSize(
    width: number,
    height: number,
    blurAmount: number,
): { width: number; height: number; scale: number } {
    const normalizedBlurAmount = clamp(blurAmount, 0, 50);
    const maxSide = Math.max(WEBGL_MIN_BLUR_MAX_SIDE, CPU_BLUR_MAX_SIDE - normalizedBlurAmount * 2);
    return getBlurRenderSize(width, height, maxSide);
}

function getBlurRenderSize(
    width: number,
    height: number,
    maxRenderSide: number,
): { width: number; height: number; scale: number } {
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

export function getCpuBlurRadius(blurAmount: number, scale: number): number {
    if (blurAmount <= 0 || scale <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(18, Math.round(blurAmount * scale * 0.75)));
}

function getWebGlBlurRadius(blurAmount: number, scale: number): number {
    if (blurAmount <= 0 || scale <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(WEBGL_BLUR_MAX_RADIUS, Math.round(blurAmount * scale * 1.1)));
}

export function boxBlurImageData(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
    iterations = CPU_BLUR_ITERATIONS,
): void {
    if (width <= 0 || height <= 0 || radius <= 0 || iterations <= 0) {
        return;
    }

    const source = new Uint8ClampedArray(data);
    const target = new Uint8ClampedArray(data.length);

    for (let iteration = 0; iteration < iterations; iteration++) {
        boxBlurHorizontal(source, target, width, height, radius);
        boxBlurVertical(target, source, width, height, radius);
    }

    data.set(source);
}

function boxBlurHorizontal(
    source: Uint8ClampedArray,
    target: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
): void {
    const windowSize = radius * 2 + 1;

    for (let y = 0; y < height; y++) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;

        for (let offset = -radius; offset <= radius; offset++) {
            const x = clamp(offset, 0, width - 1);
            const index = (y * width + x) * 4;
            red += source[index];
            green += source[index + 1];
            blue += source[index + 2];
            alpha += source[index + 3];
        }

        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            target[index] = red / windowSize;
            target[index + 1] = green / windowSize;
            target[index + 2] = blue / windowSize;
            target[index + 3] = alpha / windowSize;

            const removeX = clamp(x - radius, 0, width - 1);
            const addX = clamp(x + radius + 1, 0, width - 1);
            const removeIndex = (y * width + removeX) * 4;
            const addIndex = (y * width + addX) * 4;

            red += source[addIndex] - source[removeIndex];
            green += source[addIndex + 1] - source[removeIndex + 1];
            blue += source[addIndex + 2] - source[removeIndex + 2];
            alpha += source[addIndex + 3] - source[removeIndex + 3];
        }
    }
}

function boxBlurVertical(
    source: Uint8ClampedArray,
    target: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
): void {
    const windowSize = radius * 2 + 1;

    for (let x = 0; x < width; x++) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;

        for (let offset = -radius; offset <= radius; offset++) {
            const y = clamp(offset, 0, height - 1);
            const index = (y * width + x) * 4;
            red += source[index];
            green += source[index + 1];
            blue += source[index + 2];
            alpha += source[index + 3];
        }

        for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 4;
            target[index] = red / windowSize;
            target[index + 1] = green / windowSize;
            target[index + 2] = blue / windowSize;
            target[index + 3] = alpha / windowSize;

            const removeY = clamp(y - radius, 0, height - 1);
            const addY = clamp(y + radius + 1, 0, height - 1);
            const removeIndex = (removeY * width + x) * 4;
            const addIndex = (addY * width + x) * 4;

            red += source[addIndex] - source[removeIndex];
            green += source[addIndex + 1] - source[removeIndex + 1];
            blue += source[addIndex + 2] - source[removeIndex + 2];
            alpha += source[addIndex + 3] - source[removeIndex + 3];
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function logSelectedBackend(backend: BlurBackend): void {
    if (backend === "none" || loggedBackends.has(backend)) {
        return;
    }

    loggedBackends.add(backend);

    if (backend === "webgl-blur") {
        console.info("[BackgroundProcessor] Using WebGL background blur renderer.");
        return;
    }

    console.warn("[BackgroundProcessor] Using CPU background blur fallback.");
}

function logWebGlFailure(error: unknown): void {
    if (loggedWebGlFailure) {
        return;
    }

    loggedWebGlFailure = true;
    console.warn("[BackgroundProcessor] WebGL blur renderer failed; using CPU fallback.", error);
}

const BLUR_VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

const BLUR_FRAGMENT_SHADER = `
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

class WebGlBlurRenderer {
    private canvas = document.createElement("canvas");
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private sourceTexture: WebGLTexture | null = null;
    private firstPassTexture: WebGLTexture | null = null;
    private secondPassTexture: WebGLTexture | null = null;
    private firstPassFramebuffer: WebGLFramebuffer | null = null;
    private secondPassFramebuffer: WebGLFramebuffer | null = null;
    private framebufferWidth = 0;
    private framebufferHeight = 0;
    private positionLocation = -1;
    private texCoordLocation = -1;
    private textureLocation: WebGLUniformLocation | null = null;
    private texelOffsetLocation: WebGLUniformLocation | null = null;
    private radiusLocation: WebGLUniformLocation | null = null;
    private contextLost = false;

    private readonly handleContextLost = (event: Event): void => {
        event.preventDefault();
        this.contextLost = true;
        this.releaseResources();
    };

    private readonly handleContextRestored = (): void => {
        this.contextLost = false;
        this.releaseResources();
        this.gl = null;
    };

    constructor() {
        this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
        this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);
    }

    public draw(
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): HTMLCanvasElement | null {
        if (this.contextLost) {
            return null;
        }

        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return null;
        }

        const gl = this.getContext();
        if (gl.isContextLost()) {
            this.contextLost = true;
            return null;
        }

        if (this.canvas.width !== blurSize.width || this.canvas.height !== blurSize.height) {
            this.canvas.width = blurSize.width;
            this.canvas.height = blurSize.height;
        }

        this.ensureProgram(gl);
        this.ensureBuffers(gl);
        this.ensureTextures(gl, blurSize.width, blurSize.height);

        const radius = getWebGlBlurRadius(blurAmount, blurSize.scale);

        try {
            gl.viewport(0, 0, blurSize.width, blurSize.height);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.clearColor(0, 0, 0, 1);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
            this.configureTexture(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);

            let sourceTexture = this.sourceTexture!;
            for (let iteration = 0; iteration < CPU_BLUR_ITERATIONS; iteration++) {
                this.drawPass(gl, sourceTexture, this.firstPassFramebuffer, 1 / blurSize.width, 0, radius);
                this.drawPass(gl, this.firstPassTexture!, this.secondPassFramebuffer, 0, 1 / blurSize.height, radius);
                sourceTexture = this.secondPassTexture!;
            }
            this.drawPass(gl, sourceTexture, null, 0, 0, 0);
            gl.flush();
        } catch (error) {
            if (gl.isContextLost()) {
                this.contextLost = true;
                return null;
            }
            throw error;
        }

        return this.canvas;
    }

    public close(): void {
        this.canvas.removeEventListener("webglcontextlost", this.handleContextLost, false);
        this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored, false);
        this.releaseResources();
        this.gl = null;
        this.canvas.width = 0;
        this.canvas.height = 0;
    }

    private getContext(): WebGLRenderingContext {
        if (this.gl) {
            return this.gl;
        }

        const gl = this.canvas.getContext("webgl", {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
        });

        if (!gl) {
            throw new Error("Unable to create WebGL blur context");
        }

        this.gl = gl;
        return this.gl;
    }

    private ensureProgram(gl: WebGLRenderingContext): void {
        if (this.program) {
            return;
        }

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, BLUR_VERTEX_SHADER);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, BLUR_FRAGMENT_SHADER);
        const program = gl.createProgram();

        if (!program) {
            throw new Error("Unable to create WebGL blur program");
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const message = gl.getProgramInfoLog(program) ?? "Unknown WebGL program link error";
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            throw new Error(message);
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        this.program = program;
        this.positionLocation = gl.getAttribLocation(program, "a_position");
        this.texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
        this.textureLocation = gl.getUniformLocation(program, "u_texture");
        this.texelOffsetLocation = gl.getUniformLocation(program, "u_texelOffset");
        this.radiusLocation = gl.getUniformLocation(program, "u_radius");

        if (
            this.positionLocation < 0 ||
            this.texCoordLocation < 0 ||
            !this.textureLocation ||
            !this.texelOffsetLocation ||
            !this.radiusLocation
        ) {
            throw new Error("Unable to resolve WebGL blur shader locations");
        }
    }

    private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error("Unable to create WebGL blur shader");
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(shader) ?? "Unknown WebGL shader compile error";
            gl.deleteShader(shader);
            throw new Error(message);
        }

        return shader;
    }

    private ensureBuffers(gl: WebGLRenderingContext): void {
        if (this.positionBuffer && this.texCoordBuffer) {
            return;
        }

        this.positionBuffer = this.createBuffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        this.texCoordBuffer = this.createBuffer(gl, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]));
    }

    private createBuffer(gl: WebGLRenderingContext, data: Float32Array): WebGLBuffer {
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error("Unable to create WebGL blur buffer");
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    private ensureTextures(gl: WebGLRenderingContext, width: number, height: number): void {
        if (!this.sourceTexture) {
            this.sourceTexture = this.createTexture(gl);
        }

        if (
            this.firstPassTexture &&
            this.secondPassTexture &&
            this.firstPassFramebuffer &&
            this.secondPassFramebuffer &&
            this.framebufferWidth === width &&
            this.framebufferHeight === height
        ) {
            return;
        }

        this.releaseFramebufferResources(gl);

        const firstPass = this.createFramebufferTexture(gl, width, height);
        const secondPass = this.createFramebufferTexture(gl, width, height);

        this.firstPassTexture = firstPass.texture;
        this.firstPassFramebuffer = firstPass.framebuffer;
        this.secondPassTexture = secondPass.texture;
        this.secondPassFramebuffer = secondPass.framebuffer;
        this.framebufferWidth = width;
        this.framebufferHeight = height;
    }

    private createTexture(gl: WebGLRenderingContext): WebGLTexture {
        const texture = gl.createTexture();
        if (!texture) {
            throw new Error("Unable to create WebGL blur texture");
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.configureTexture(gl);
        return texture;
    }

    private createFramebufferTexture(
        gl: WebGLRenderingContext,
        width: number,
        height: number,
    ): { texture: WebGLTexture; framebuffer: WebGLFramebuffer } {
        const texture = this.createTexture(gl);
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

        return { texture, framebuffer };
    }

    private configureTexture(gl: WebGLRenderingContext): void {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    private drawPass(
        gl: WebGLRenderingContext,
        texture: WebGLTexture,
        framebuffer: WebGLFramebuffer | null,
        texelOffsetX: number,
        texelOffsetY: number,
        radius: number,
    ): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.textureLocation, 0);
        gl.uniform2f(this.texelOffsetLocation, texelOffsetX, texelOffsetY);
        gl.uniform1f(this.radiusLocation, radius);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private releaseResources(): void {
        const gl = this.gl;
        if (!gl || gl.isContextLost()) {
            this.program = null;
            this.positionBuffer = null;
            this.texCoordBuffer = null;
            this.sourceTexture = null;
            this.firstPassTexture = null;
            this.secondPassTexture = null;
            this.firstPassFramebuffer = null;
            this.secondPassFramebuffer = null;
            this.radiusLocation = null;
            return;
        }

        if (this.program) {
            gl.deleteProgram(this.program);
            this.program = null;
        }
        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
            this.positionBuffer = null;
        }
        if (this.texCoordBuffer) {
            gl.deleteBuffer(this.texCoordBuffer);
            this.texCoordBuffer = null;
        }
        if (this.sourceTexture) {
            gl.deleteTexture(this.sourceTexture);
            this.sourceTexture = null;
        }

        this.releaseFramebufferResources(gl);
    }

    private releaseFramebufferResources(gl: WebGLRenderingContext): void {
        if (this.firstPassTexture) {
            gl.deleteTexture(this.firstPassTexture);
            this.firstPassTexture = null;
        }
        if (this.secondPassTexture) {
            gl.deleteTexture(this.secondPassTexture);
            this.secondPassTexture = null;
        }
        if (this.firstPassFramebuffer) {
            gl.deleteFramebuffer(this.firstPassFramebuffer);
            this.firstPassFramebuffer = null;
        }
        if (this.secondPassFramebuffer) {
            gl.deleteFramebuffer(this.secondPassFramebuffer);
            this.secondPassFramebuffer = null;
        }

        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
    }
}

export class CanvasBlurRenderer {
    private webGlRenderer: WebGlBlurRenderer | null = null;
    private webGlUnavailable = false;
    private cpuCanvas: HTMLCanvasElement | null = null;
    private cpuContext: CanvasRenderingContext2D | null = null;
    private lastBackend: BlurBackend = "none";

    public getLastBackend(): BlurBackend {
        return this.lastBackend;
    }

    public drawBlurredImage(
        destinationContext: CanvasRenderingContext2D,
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount = 15,
    ): BlurBackend {
        if (!width || !height || width <= 0 || height <= 0) {
            this.lastBackend = "none";
            return this.lastBackend;
        }

        if (!this.webGlUnavailable) {
            const webGlCanvas = this.drawWithWebGlBlur(source, width, height, blurAmount);
            if (webGlCanvas) {
                this.drawScaledCanvas(
                    destinationContext,
                    webGlCanvas,
                    webGlCanvas.width,
                    webGlCanvas.height,
                    width,
                    height,
                );
                this.lastBackend = "webgl-blur";
                logSelectedBackend(this.lastBackend);
                return this.lastBackend;
            }
        }

        this.lastBackend = this.drawWithCpuBlur(destinationContext, source, width, height, blurAmount);
        logSelectedBackend(this.lastBackend);
        return this.lastBackend;
    }

    public close(): void {
        this.webGlRenderer?.close();
        this.webGlRenderer = null;
        this.cpuCanvas = null;
        this.cpuContext = null;
        this.webGlUnavailable = false;
        this.lastBackend = "none";
    }

    private drawWithWebGlBlur(
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): HTMLCanvasElement | null {
        try {
            this.webGlRenderer = this.webGlRenderer ?? new WebGlBlurRenderer();
            return this.webGlRenderer.draw(source, width, height, blurAmount);
        } catch (error) {
            logWebGlFailure(error);
            this.webGlRenderer?.close();
            this.webGlRenderer = null;
            this.webGlUnavailable = true;
            return null;
        }
    }

    private drawWithCpuBlur(
        destinationContext: CanvasRenderingContext2D,
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): BlurBackend {
        try {
            const cpuContext = this.getCpuContext();
            const blurSize = getCpuBlurSize(width, height);

            if (!blurSize.width || !blurSize.height) {
                return "none";
            }

            if (
                !this.cpuCanvas ||
                this.cpuCanvas.width !== blurSize.width ||
                this.cpuCanvas.height !== blurSize.height
            ) {
                this.cpuCanvas = this.cpuCanvas ?? document.createElement("canvas");
                this.cpuCanvas.width = blurSize.width;
                this.cpuCanvas.height = blurSize.height;
            }

            cpuContext.filter = "none";
            cpuContext.globalCompositeOperation = "source-over";
            cpuContext.drawImage(source, 0, 0, blurSize.width, blurSize.height);

            const imageData = cpuContext.getImageData(0, 0, blurSize.width, blurSize.height);
            const radius = getCpuBlurRadius(blurAmount, blurSize.scale);
            boxBlurImageData(imageData.data, blurSize.width, blurSize.height, radius);
            cpuContext.putImageData(imageData, 0, 0);

            this.drawScaledCanvas(destinationContext, this.cpuCanvas, blurSize.width, blurSize.height, width, height);

            return "cpu-blur";
        } catch (error) {
            if (!loggedCpuFailure) {
                loggedCpuFailure = true;
                console.warn("[BackgroundProcessor] CPU blur renderer failed; drawing the unblurred frame.", error);
            }
            destinationContext.drawImage(source, 0, 0, width, height);
            return "none";
        }
    }

    private getCpuContext(): CanvasRenderingContext2D {
        if (!this.cpuCanvas) {
            this.cpuCanvas = document.createElement("canvas");
        }

        if (!this.cpuContext) {
            this.cpuContext = this.cpuCanvas.getContext("2d", { willReadFrequently: true });
            if (!this.cpuContext) {
                throw new Error("Unable to create CPU blur canvas context");
            }
        }

        return this.cpuContext;
    }

    private drawScaledCanvas(
        destinationContext: CanvasRenderingContext2D,
        sourceCanvas: HTMLCanvasElement,
        sourceWidth: number,
        sourceHeight: number,
        destinationWidth: number,
        destinationHeight: number,
    ): void {
        const previousImageSmoothingEnabled = destinationContext.imageSmoothingEnabled;
        const previousImageSmoothingQuality = destinationContext.imageSmoothingQuality;
        destinationContext.imageSmoothingEnabled = true;
        destinationContext.imageSmoothingQuality = "high";
        destinationContext.drawImage(
            sourceCanvas,
            0,
            0,
            sourceWidth,
            sourceHeight,
            0,
            0,
            destinationWidth,
            destinationHeight,
        );
        destinationContext.imageSmoothingEnabled = previousImageSmoothingEnabled;
        destinationContext.imageSmoothingQuality = previousImageSmoothingQuality;
    }
}
