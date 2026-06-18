import type { MPMask } from "@mediapipe/tasks-vision";
import {
    BLUR_FRAGMENT_SHADER,
    BLUR_ITERATIONS,
    BLUR_VERTEX_SHADER,
    COMPOSITE_FRAGMENT_SHADER,
    getWebGlBlurRadius,
    getWebGlBlurSize,
} from "./CanvasBlurRenderer";

let loggedSelectedBackend = false;
let loggedFailure = false;

function logSelectedBackend(): void {
    if (loggedSelectedBackend) {
        return;
    }

    loggedSelectedBackend = true;
    console.info("[BackgroundProcessor] Using WebGL background blur compositor.");
}

function logFailure(error: unknown): void {
    if (loggedFailure) {
        return;
    }

    loggedFailure = true;
    console.warn("[BackgroundProcessor] WebGL background blur compositor failed; using fallback.", error);
}

export class TasksVisionBlurCompositor {
    private blurProgram: WebGLProgram | null = null;
    private compositeProgram: WebGLProgram | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private sourceTexture: WebGLTexture | null = null;
    private firstPassTexture: WebGLTexture | null = null;
    private secondPassTexture: WebGLTexture | null = null;
    private firstPassFramebuffer: WebGLFramebuffer | null = null;
    private secondPassFramebuffer: WebGLFramebuffer | null = null;
    private framebufferWidth = 0;
    private framebufferHeight = 0;
    private blurPositionLocation = -1;
    private blurTexCoordLocation = -1;
    private blurTextureLocation: WebGLUniformLocation | null = null;
    private texelOffsetLocation: WebGLUniformLocation | null = null;
    private radiusLocation: WebGLUniformLocation | null = null;
    private compositePositionLocation = -1;
    private compositeTexCoordLocation = -1;
    private sharpTextureLocation: WebGLUniformLocation | null = null;
    private blurredTextureLocation: WebGLUniformLocation | null = null;
    private maskTextureLocation: WebGLUniformLocation | null = null;
    private unavailable = false;

    constructor(private readonly gl: WebGL2RenderingContext) {}

    public draw(source: CanvasImageSource, mask: MPMask, width: number, height: number, blurAmount: number): boolean {
        if (this.unavailable || !width || !height || width <= 0 || height <= 0 || this.gl.isContextLost()) {
            return false;
        }

        if (mask.canvas && mask.canvas !== this.gl.canvas) {
            return false;
        }

        const blurSize = getWebGlBlurSize(width, height, blurAmount);
        if (!blurSize.width || !blurSize.height) {
            return false;
        }

        try {
            this.ensurePrograms();
            this.ensureBuffers();
            this.ensureTextures(blurSize.width, blurSize.height);

            const blurredTexture = this.renderBlurredTexture(source, blurSize, blurAmount);
            this.drawCompositePass(this.sourceTexture!, blurredTexture, mask.getAsWebGLTexture(), width, height);
            this.gl.flush();
            logSelectedBackend();
            return true;
        } catch (error) {
            if (!this.gl.isContextLost()) {
                this.unavailable = true;
                this.close();
            }
            logFailure(error);
            return false;
        }
    }

    public close(): void {
        const gl = this.gl;
        if (gl.isContextLost()) {
            this.clearReferences();
            return;
        }

        if (this.blurProgram) {
            gl.deleteProgram(this.blurProgram);
        }
        if (this.compositeProgram) {
            gl.deleteProgram(this.compositeProgram);
        }
        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
        }
        if (this.texCoordBuffer) {
            gl.deleteBuffer(this.texCoordBuffer);
        }
        if (this.sourceTexture) {
            gl.deleteTexture(this.sourceTexture);
        }

        this.releaseFramebufferResources();
        this.clearReferences();
    }

    private ensurePrograms(): void {
        if (!this.blurProgram) {
            this.blurProgram = this.createProgram(BLUR_VERTEX_SHADER, BLUR_FRAGMENT_SHADER, "blur");
            this.blurPositionLocation = this.gl.getAttribLocation(this.blurProgram, "a_position");
            this.blurTexCoordLocation = this.gl.getAttribLocation(this.blurProgram, "a_texCoord");
            this.blurTextureLocation = this.gl.getUniformLocation(this.blurProgram, "u_texture");
            this.texelOffsetLocation = this.gl.getUniformLocation(this.blurProgram, "u_texelOffset");
            this.radiusLocation = this.gl.getUniformLocation(this.blurProgram, "u_radius");

            if (
                this.blurPositionLocation < 0 ||
                this.blurTexCoordLocation < 0 ||
                !this.blurTextureLocation ||
                !this.texelOffsetLocation ||
                !this.radiusLocation
            ) {
                throw new Error("Unable to resolve Tasks Vision blur shader locations");
            }
        }

        if (!this.compositeProgram) {
            this.compositeProgram = this.createProgram(BLUR_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER, "composite");
            this.compositePositionLocation = this.gl.getAttribLocation(this.compositeProgram, "a_position");
            this.compositeTexCoordLocation = this.gl.getAttribLocation(this.compositeProgram, "a_texCoord");
            this.sharpTextureLocation = this.gl.getUniformLocation(this.compositeProgram, "u_sharpTexture");
            this.blurredTextureLocation = this.gl.getUniformLocation(this.compositeProgram, "u_blurredTexture");
            this.maskTextureLocation = this.gl.getUniformLocation(this.compositeProgram, "u_maskTexture");

            if (
                this.compositePositionLocation < 0 ||
                this.compositeTexCoordLocation < 0 ||
                !this.sharpTextureLocation ||
                !this.blurredTextureLocation ||
                !this.maskTextureLocation
            ) {
                throw new Error("Unable to resolve Tasks Vision blur composite shader locations");
            }
        }
    }

    private createProgram(vertexSource: string, fragmentSource: string, label: string): WebGLProgram {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource, label);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource, label);
        const program = gl.createProgram();

        if (!program) {
            throw new Error(`Unable to create Tasks Vision ${label} program`);
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const message = gl.getProgramInfoLog(program) ?? `Unknown Tasks Vision ${label} program link error`;
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
            throw new Error(`Unable to create Tasks Vision ${label} shader`);
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(shader) ?? `Unknown Tasks Vision ${label} shader compile error`;
            gl.deleteShader(shader);
            throw new Error(message);
        }

        return shader;
    }

    private ensureBuffers(): void {
        if (this.positionBuffer && this.texCoordBuffer) {
            return;
        }

        this.positionBuffer = this.createBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        this.texCoordBuffer = this.createBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]));
    }

    private createBuffer(data: Float32Array): WebGLBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error("Unable to create Tasks Vision blur buffer");
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    private ensureTextures(width: number, height: number): void {
        if (!this.sourceTexture) {
            this.sourceTexture = this.createTexture();
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

        this.releaseFramebufferResources();

        const firstPass = this.createFramebufferTexture(width, height);
        const secondPass = this.createFramebufferTexture(width, height);

        this.firstPassTexture = firstPass.texture;
        this.firstPassFramebuffer = firstPass.framebuffer;
        this.secondPassTexture = secondPass.texture;
        this.secondPassFramebuffer = secondPass.framebuffer;
        this.framebufferWidth = width;
        this.framebufferHeight = height;
    }

    private createTexture(): WebGLTexture {
        const texture = this.gl.createTexture();
        if (!texture) {
            throw new Error("Unable to create Tasks Vision blur texture");
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.configureTexture();
        return texture;
    }

    private createFramebufferTexture(
        width: number,
        height: number,
    ): {
        texture: WebGLTexture;
        framebuffer: WebGLFramebuffer;
    } {
        const gl = this.gl;
        const texture = this.createTexture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            gl.deleteTexture(texture);
            throw new Error("Unable to create Tasks Vision blur framebuffer");
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteTexture(texture);
            gl.deleteFramebuffer(framebuffer);
            throw new Error("Tasks Vision blur framebuffer is incomplete");
        }

        return { texture, framebuffer };
    }

    private configureTexture(): void {
        const gl = this.gl;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    private renderBlurredTexture(
        source: CanvasImageSource,
        blurSize: { width: number; height: number; scale: number },
        blurAmount: number,
    ): WebGLTexture {
        const gl = this.gl;
        const radius = getWebGlBlurRadius(blurAmount, blurSize.scale);

        gl.viewport(0, 0, blurSize.width, blurSize.height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 1);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
        this.configureTexture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);

        let sourceTexture = this.sourceTexture!;
        for (let iteration = 0; iteration < BLUR_ITERATIONS; iteration++) {
            this.drawBlurPass(sourceTexture, this.firstPassFramebuffer, 1 / blurSize.width, 0, radius);
            this.drawBlurPass(this.firstPassTexture!, this.secondPassFramebuffer, 0, 1 / blurSize.height, radius);
            sourceTexture = this.secondPassTexture!;
        }

        return sourceTexture;
    }

    private drawBlurPass(
        texture: WebGLTexture,
        framebuffer: WebGLFramebuffer | null,
        texelOffsetX: number,
        texelOffsetY: number,
        radius: number,
    ): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.blurProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.blurPositionLocation);
        gl.vertexAttribPointer(this.blurPositionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.blurTexCoordLocation);
        gl.vertexAttribPointer(this.blurTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.blurTextureLocation, 0);
        gl.uniform2f(this.texelOffsetLocation, texelOffsetX, texelOffsetY);
        gl.uniform1f(this.radiusLocation, radius);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private drawCompositePass(
        sharpTexture: WebGLTexture,
        blurredTexture: WebGLTexture,
        maskTexture: WebGLTexture,
        width: number,
        height: number,
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
        gl.uniform1i(this.maskTextureLocation, 2);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private releaseFramebufferResources(): void {
        const gl = this.gl;

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

    private clearReferences(): void {
        this.blurProgram = null;
        this.compositeProgram = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.sourceTexture = null;
        this.firstPassTexture = null;
        this.secondPassTexture = null;
        this.firstPassFramebuffer = null;
        this.secondPassFramebuffer = null;
        this.blurTextureLocation = null;
        this.texelOffsetLocation = null;
        this.radiusLocation = null;
        this.sharpTextureLocation = null;
        this.blurredTextureLocation = null;
        this.maskTextureLocation = null;
        this.framebufferWidth = 0;
        this.framebufferHeight = 0;
    }
}
