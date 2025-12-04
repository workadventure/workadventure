import { ImageSegmenter, FilesetResolver, MPMask } from "@mediapipe/tasks-vision";
import { BackgroundTransformer } from "./createBackgroundTransformer";

/**
 * MediaPipe Tasks Vision-based background transformer for video streams
 * Uses the modern @mediapipe/tasks-vision API with ImageSegmenter
 */
export class MediaPipeTasksVisionTransformer implements BackgroundTransformer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null = null;
    private imageSegmenter: ImageSegmenter | null = null;
    private filesetResolver: FilesetResolver | null = null;
    private isInitialized = false;
    private backgroundImage: HTMLImageElement | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    private outputStream: MediaStream | null = null;
    private inputVideo: HTMLVideoElement;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private closed = false;
    private frameCount = 0;
    private startTime = performance.now();
    private initPromise: Promise<void>;
    private frameRate = 33;
    // Use a global timestamp that never resets to ensure monotonic timestamps for MediaPipe
    private globalStartTime = performance.now();

    // WebGL rendering pipeline
    private useWebGL = false;
    private gl: WebGL2RenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private frameTexture: WebGLTexture | null = null;
    private backgroundTexture: WebGLTexture | null = null;
    private maskTexture: WebGLTexture | null = null;
    private handleWebGLContextLost: ((event: Event) => void) | null = null;
    private backgroundTextureAllocated = false;
    private lastBackgroundMode: string | null = null;
    private maskTextureAllocated = false;

    // Canvas2D fallback resources
    private tempCanvas: HTMLCanvasElement | null = null;
    private tempCtx: CanvasRenderingContext2D | null = null;
    private maskCanvas: HTMLCanvasElement | null = null;
    private maskCtx: CanvasRenderingContext2D | null = null;

    // Debug flag to track mask inversion issues
    // Try inverted first, as some models may use different category numbering
    private maskInverted = true;

    // Vertex shader (simple fullscreen quad)
    private static readonly VERTEX_SHADER = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    // Fragment shader (composite frame + background using mask)
    private static readonly FRAGMENT_SHADER = `#version 300 es
        precision mediump float;
        
        in vec2 v_texCoord;
        uniform sampler2D u_frame;
        uniform sampler2D u_background;
        uniform sampler2D u_mask;
        uniform float u_blur;
        uniform bool u_invert;
        
        out vec4 outColor;
        
        // Simple box blur (3x3 for now - can be improved with multi-pass gaussian)
        vec4 blur(sampler2D tex, vec2 uv, float amount) {
            vec2 texelSize = vec2(1.0) / vec2(textureSize(tex, 0));
            vec4 result = vec4(0.0);
            float total = 0.0;
            
            for(float x = -amount; x <= amount; x += 1.0) {
                for(float y = -amount; y <= amount; y += 1.0) {
                    result += texture(tex, uv + vec2(x, y) * texelSize);
                    total += 1.0;
                }
            }
            
            return result / total;
        }
        
        void main() {
            vec4 frame = texture(u_frame, v_texCoord);
            vec4 background = texture(u_background, v_texCoord);
            
            // Read mask value (category mask: 0=background, 1=person or vice versa)
            float maskValue = texture(u_mask, v_texCoord).r; // R8 sampled as normalized [0,1]
            
            // Apply inversion if needed
            float alpha = u_invert ? (1.0 - maskValue) : maskValue;
            
            // Apply blur to background if enabled
            if (u_blur > 0.5) {
                background = blur(u_frame, v_texCoord, 3.0);
            }
            
            // Mix: alpha=1.0 shows frame (person), alpha=0.0 shows background
            outColor = mix(background, frame, alpha);
        }
    `;

    constructor(
        private config: {
            mode: "none" | "blur" | "image" | "video";
            blurAmount?: number;
            backgroundImage?: string;
            backgroundVideo?: string;
        }
    ) {
        this.canvas = document.createElement("canvas");

        // Try WebGL2 first
        const gl = this.canvas.getContext("webgl2", {
            alpha: false,
            desynchronized: true,
            antialias: false,
            preserveDrawingBuffer: false,
        });

        if (gl) {
            this.gl = gl;
            this.useWebGL = true;
            console.info("[MediaPipe Tasks Vision] Using WebGL2 rendering pipeline");

            // Handle WebGL context loss
            this.handleWebGLContextLost = (event: Event) => {
                event.preventDefault();
                console.warn("[MediaPipe Tasks Vision] WebGL context lost, falling back to Canvas2D");
                this.useWebGL = false;
                this.gl = null;

                // Reset texture allocation flags
                this.maskTextureAllocated = false;
                this.backgroundTextureAllocated = false;

                // Initialize Canvas2D context
                if (!this.ctx) {
                    this.ctx = this.canvas.getContext("2d", {
                        alpha: false,
                        desynchronized: true,
                    })!;
                }
                this.initializeTempCanvas();
                this.initializeMaskCanvas();
            };
            this.canvas.addEventListener("webglcontextlost", this.handleWebGLContextLost);
        } else {
            // Fallback to Canvas2D
            this.ctx = this.canvas.getContext("2d", {
                alpha: false,
                desynchronized: true,
            })!;
            console.info("[MediaPipe Tasks Vision] WebGL2 not available, using Canvas2D fallback");
        }

        this.inputVideo = document.createElement("video");
        this.inputVideo.autoplay = true;
        this.inputVideo.muted = true;
        this.inputVideo.playsInline = true;

        // Initialize MediaPipe
        this.initPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.initializeMediaPipe();
            await this.loadBackgroundResources();

            if (this.useWebGL && this.gl) {
                this.initializeWebGLPipeline();
            } else {
                // Initialize Canvas2D fallback resources
                this.initializeTempCanvas();
                this.initializeMaskCanvas();
                // Initialize 2D context if not already done
                if (!this.ctx) {
                    this.ctx = this.canvas.getContext("2d", {
                        alpha: false,
                        desynchronized: true,
                    })!;
                }
            }

            this.isInitialized = true;
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] Initialization failed:", error);
            throw error;
        }
    }

    private async initializeMediaPipe(): Promise<void> {
        // Use local WASM files
        const wasmPath = "./static/tasksVision/wasm";
        this.filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);

        // Use local selfie segmentation model
        const modelPath = "./static/tasksVision/selfie_segmenter.tflite";

        // Try GPU first, fallback to CPU if it fails
        try {
            this.imageSegmenter = await ImageSegmenter.createFromOptions(this.filesetResolver, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "GPU",
                },
                runningMode: "VIDEO",
                outputCategoryMask: true,
                outputConfidenceMasks: false,
            });

            console.info("[MediaPipe Tasks Vision] Initialized successfully with GPU");
        } catch (gpuError) {
            console.warn("[MediaPipe Tasks Vision] GPU initialization failed, falling back to CPU:", gpuError);

            try {
                this.imageSegmenter = await ImageSegmenter.createFromOptions(this.filesetResolver, {
                    baseOptions: {
                        modelAssetPath: modelPath,
                        delegate: "CPU",
                    },
                    runningMode: "VIDEO",
                    outputCategoryMask: true,
                    outputConfidenceMasks: false,
                });

                console.info("[MediaPipe Tasks Vision] Initialized successfully with CPU fallback");
            } catch (cpuError) {
                console.error("[MediaPipe Tasks Vision] Both GPU and CPU initialization failed:", cpuError);
                throw cpuError;
            }
        }
    }

    private initializeTempCanvas(): void {
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = this.tempCanvas.getContext("2d")!;
    }

    private initializeMaskCanvas(): void {
        this.maskCanvas = document.createElement("canvas");
        this.maskCtx = this.maskCanvas.getContext("2d")!;
    }

    private initializeWebGLPipeline(): void {
        if (!this.gl) return;

        const gl = this.gl;

        // Compile shaders
        const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, MediaPipeTasksVisionTransformer.VERTEX_SHADER);
        const fragmentShader = this.compileShader(
            gl,
            gl.FRAGMENT_SHADER,
            MediaPipeTasksVisionTransformer.FRAGMENT_SHADER
        );

        if (!vertexShader || !fragmentShader) {
            console.error("[MediaPipe Tasks Vision] Failed to compile shaders");
            this.useWebGL = false;
            return;
        }

        // Link program
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("[MediaPipe Tasks Vision] Program link error:", gl.getProgramInfoLog(this.program));
            this.useWebGL = false;
            return;
        }

        // Setup geometry (fullscreen quad)
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]); // Flip Y for correct orientation

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        // Create textures
        this.frameTexture = this.createTexture(gl);
        this.backgroundTexture = this.createTexture(gl);
        this.maskTexture = this.createTexture(gl);

        console.info("[MediaPipe Tasks Vision] WebGL pipeline initialized successfully");
    }

    private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("[MediaPipe Tasks Vision] Shader compile error:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    private createTexture(gl: WebGL2RenderingContext): WebGLTexture {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return texture;
    }

    /**
     * Convert MPMask to HTMLCanvasElement for compositing
     * categoryMask contains category indices: 0 = background, 1 = foreground (person)
     */
    private maskToCanvas(mask: MPMask, width: number, height: number): HTMLCanvasElement {
        if (!this.maskCanvas || !this.maskCtx) {
            this.initializeMaskCanvas();
        }

        // Ensure mask canvas dimensions match
        if (this.maskCanvas!.width !== width || this.maskCanvas!.height !== height) {
            this.maskCanvas!.width = width;
            this.maskCanvas!.height = height;
        }

        // Get mask data as Uint8Array (category indices: 0 = background, 1 = foreground)
        const maskData = mask.getAsUint8Array();

        // Validate mask dimensions
        if (maskData.length !== width * height) {
            console.error(
                `[MediaPipe Tasks Vision] Mask size mismatch: expected ${width * height}, got ${maskData.length}`
            );
            // Create a fallback mask (all foreground)
            this.maskCtx!.fillStyle = "white";
            this.maskCtx!.fillRect(0, 0, width, height);
            return this.maskCanvas!;
        }

        // Create ImageData from mask
        const imageData = this.maskCtx!.createImageData(width, height);
        const data = imageData.data;

        // Convert category indices to alpha mask
        // Selfie segmentation model: Category 0 = background, Category 1 = foreground (person)
        // If maskInverted flag is set, reverse the logic
        for (let i = 0; i < maskData.length; i++) {
            const category = maskData[i];
            // Category 1 = person (foreground) -> alpha 255, Category 0 = background -> alpha 0
            // If inverted, swap: Category 0 = person, Category 1 = background
            let alpha: number;
            if (this.maskInverted) {
                alpha = category === 0 ? 255 : 0; // Inverted: 0 = person, 1 = background
            } else {
                alpha = category === 1 ? 255 : 0; // Normal: 1 = person, 0 = background
            }
            data[i * 4] = 255; // R (white)
            data[i * 4 + 1] = 255; // G (white)
            data[i * 4 + 2] = 255; // B (white)
            data[i * 4 + 3] = alpha; // A (use category as alpha)
        }

        // Put ImageData to canvas
        this.maskCtx!.putImageData(imageData, 0, 0);

        return this.maskCanvas!;
    }

    private async loadBackgroundResources(): Promise<void> {
        if (this.config.mode === "image" && this.config.backgroundImage) {
            this.backgroundImage = new Image();
            this.backgroundImage.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                this.backgroundImage!.onload = () => resolve();
                this.backgroundImage!.onerror = () => reject(new Error("Failed to load background image"));
                this.backgroundImage!.src = this.config.backgroundImage!;
            });
        }

        if (this.config.mode === "video" && this.config.backgroundVideo) {
            this.backgroundVideo = document.createElement("video");
            this.backgroundVideo.crossOrigin = "anonymous";
            this.backgroundVideo.loop = true;
            this.backgroundVideo.muted = true;
            this.backgroundVideo.autoplay = true;
            this.backgroundVideo.src = this.config.backgroundVideo;
            await this.backgroundVideo.play();
        }
    }

    private processFrame(): void {
        if (this.closed || !this.outputStream || this.config.mode === "none" || !this.imageSegmenter) {
            return;
        }

        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        // Check if video has valid dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        if (this.inputVideo.readyState < 2) {
            // Video not ready yet, retry
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        try {
            // Calculate timestamp in microseconds (MediaPipe requires microseconds)
            // Use a global timestamp that never resets to ensure strict monotonic increase
            // This is critical: MediaPipe requires timestamps to be strictly increasing
            const currentTime = performance.now();
            const timestampMicroseconds = Math.floor((currentTime - this.globalStartTime) * 1000);

            // Segment the current video frame
            const result = this.imageSegmenter.segmentForVideo(this.inputVideo, timestampMicroseconds);

            if (result.categoryMask) {
                this.processResults(result.categoryMask);
            }
            // Silently skip if no mask - this can happen occasionally and is not critical

            // Schedule next frame
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] : ", error);
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }
    }

    private processResults(mask: MPMask): void {
        if (this.closed) {
            mask.close();
            return;
        }

        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            mask.close();
            console.warn(
                `[MediaPipe Tasks Vision] Skipping frame processing: canvas dimensions are ${width}x${height}`
            );
            return;
        }

        if (this.useWebGL && this.gl) {
            this.processResultsWebGL(mask);
        } else {
            // Fallback to Canvas2D
            const segmentationMask = this.maskToCanvas(mask, width, height);
            mask.close(); // Clean up MPMask after conversion
            this.processResultsCanvas2D(segmentationMask);
        }

        this.frameCount++;
    }

    private processResultsWebGL(mask: MPMask): void {
        if (!this.gl || !this.program) {
            mask.close();
            return;
        }

        const gl = this.gl;
        const { width, height } = this.canvas;

        try {
            // Upload mask texture
            this.uploadMaskTexture(mask);
            mask.close();

            // Upload frame texture
            gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.inputVideo);

            // Upload background texture
            this.uploadBackgroundTexture();

            // Render
            gl.useProgram(this.program);

            // Set uniforms
            const u_frame = gl.getUniformLocation(this.program, "u_frame");
            const u_background = gl.getUniformLocation(this.program, "u_background");
            const u_mask = gl.getUniformLocation(this.program, "u_mask");
            const u_blur = gl.getUniformLocation(this.program, "u_blur");
            const u_invert = gl.getUniformLocation(this.program, "u_invert");

            gl.uniform1i(u_frame, 0);
            gl.uniform1i(u_background, 1);
            gl.uniform1i(u_mask, 2);
            gl.uniform1f(u_blur, this.config.mode === "blur" ? 1.0 : 0.0);
            gl.uniform1i(u_invert, this.maskInverted ? 1 : 0);

            // Bind textures
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);

            // Setup attributes
            const a_position = gl.getAttribLocation(this.program, "a_position");
            const a_texCoord = gl.getAttribLocation(this.program, "a_texCoord");

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(a_position);
            gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
            gl.enableVertexAttribArray(a_texCoord);
            gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

            // Draw
            gl.viewport(0, 0, width, height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] WebGL rendering error:", error);
        }
    }

    private uploadMaskTexture(mask: MPMask): void {
        if (!this.gl) return;

        const gl = this.gl;
        const { width, height } = this.canvas;

        // Upload from Uint8Array to avoid cross-context issues with getAsWebGLTexture()
        const maskData = mask.getAsUint8Array();
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);

        // Set pixel store parameters for efficient upload
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        // Allocate once, then use texSubImage2D for updates
        if (!this.maskTextureAllocated) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
            this.maskTextureAllocated = true;
        }
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, maskData);
    }

    private uploadBackgroundTexture(): void {
        if (!this.gl) return;

        const gl = this.gl;
        const { width, height } = this.canvas;

        gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);

        // Reset allocation if mode changed
        if (this.lastBackgroundMode !== this.config.mode) {
            this.backgroundTextureAllocated = false;
            this.lastBackgroundMode = this.config.mode;
        }

        switch (this.config.mode) {
            case "image": {
                // Upload static image only once
                if (this.backgroundImage && !this.backgroundTextureAllocated) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.backgroundImage);
                    this.backgroundTextureAllocated = true;
                }
                break;
            }

            case "video": {
                // For video, allocate once then use texSubImage2D for updates
                if (this.backgroundVideo) {
                    if (!this.backgroundTextureAllocated) {
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                        this.backgroundTextureAllocated = true;
                    }
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.backgroundVideo);
                }
                break;
            }

            case "blur": {
                // For blur mode, skip uploading - we'll use frame texture directly in shader
                // Just ensure texture is allocated with dummy data
                if (!this.backgroundTextureAllocated) {
                    const blackPixel = new Uint8Array([0, 0, 0, 255]);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackPixel);
                    this.backgroundTextureAllocated = true;
                }
                break;
            }

            default: {
                // Solid black - upload once
                if (!this.backgroundTextureAllocated) {
                    const blackPixel = new Uint8Array([0, 0, 0, 255]);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackPixel);
                    this.backgroundTextureAllocated = true;
                }
            }
        }
    }

    private processResultsCanvas2D(segmentationMask: HTMLCanvasElement): void {
        if (!this.ctx) return;

        const { width, height } = this.canvas;

        this.ctx.clearRect(0, 0, width, height);

        if (this.config.mode === "blur") {
            this.processBlurMode(segmentationMask);
        } else if (this.config.mode === "image" || this.config.mode === "video") {
            this.processReplaceMode(segmentationMask);
        } else {
            // No effect - draw original
            this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        }
    }

    private processBlurMode(segmentationMask: HTMLCanvasElement): void {
        if (!this.ctx) return;

        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Step 1: Draw the entire image with blur as background
        this.ctx.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        this.ctx.filter = "none";

        // Step 2: Use reusable temporary canvas for the person (sharp)
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original (sharp) image on temp canvas
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Apply segmentation mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(segmentationMask, 0, 0, width, height);

        // Step 3: Draw the sharp person on top of the blurred background
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private processReplaceMode(segmentationMask: HTMLCanvasElement): void {
        if (!this.ctx) return;

        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Draw background replacement (image/video)
        this.drawBackground();

        // Use reusable temporary canvas for the person
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original image
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Apply mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(segmentationMask, 0, 0, width, height);

        // Draw the person on the main canvas
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private drawBackground(): void {
        if (!this.ctx) return;

        const { width, height } = this.canvas;

        switch (this.config.mode) {
            case "image":
                if (this.backgroundImage) {
                    // Scale image to fit canvas while maintaining aspect ratio
                    const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
                    const scaledWidth = this.backgroundImage.width * scale;
                    const scaledHeight = this.backgroundImage.height * scale;
                    const x = (width - scaledWidth) / 2;
                    const y = (height - scaledHeight) / 2;

                    this.ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
                }
                break;

            case "video":
                if (this.backgroundVideo) {
                    this.ctx.drawImage(this.backgroundVideo, 0, 0, width, height);
                }
                break;

            default:
                // Solid color fallback
                this.ctx.fillStyle = "#000000";
                this.ctx.fillRect(0, 0, width, height);
        }
    }

    public async waitForInitialization(): Promise<void> {
        await this.initPromise;
    }

    public async updateConfig(config: Partial<typeof this.config>): Promise<void> {
        // Update configuration
        Object.assign(this.config, config);

        // Reload background resources if needed
        if (config.backgroundImage || config.backgroundVideo) {
            await this.loadBackgroundResources();
        }
    }

    public getPerformanceStats() {
        const elapsed = performance.now() - this.startTime;
        const fps = this.frameCount > 0 && elapsed > 0 ? Math.round((this.frameCount / elapsed) * 1000) : 0;

        return {
            fps,
            frameCount: this.frameCount,
            elapsed: Math.round(elapsed),
            closed: this.closed,
        };
    }

    public stop(): void {
        // Stop timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    public close(): void {
        this.closed = true;

        // Stop timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Stop output stream
        if (this.outputStream) {
            this.outputStream.getVideoTracks().forEach((track) => track.stop());
            this.outputStream = null;
        }

        // Close MediaPipe
        if (this.imageSegmenter) {
            try {
                this.imageSegmenter.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing segmenter:", error);
            }
            this.imageSegmenter = null;
        }

        // Remove WebGL context lost handler
        if (this.handleWebGLContextLost) {
            this.canvas.removeEventListener("webglcontextlost", this.handleWebGLContextLost);
            this.handleWebGLContextLost = null;
        }

        // Clean up WebGL resources
        if (this.gl) {
            const gl = this.gl;

            if (this.frameTexture) gl.deleteTexture(this.frameTexture);
            if (this.backgroundTexture) gl.deleteTexture(this.backgroundTexture);
            if (this.maskTexture) gl.deleteTexture(this.maskTexture);
            if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
            if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
            if (this.program) gl.deleteProgram(this.program);

            this.frameTexture = null;
            this.backgroundTexture = null;
            this.maskTexture = null;
            this.positionBuffer = null;
            this.texCoordBuffer = null;
            this.program = null;
            this.gl = null;
        }

        // Clean up resources
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.backgroundImage = null;

        // Clean up temporary canvas
        this.tempCanvas = null;
        this.tempCtx = null;
        this.maskCanvas = null;
        this.maskCtx = null;
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        this.frameRate = inputStream.getVideoTracks()[0]?.getSettings().frameRate || 33;
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.config.mode === "none") {
            return inputStream;
        }

        // Setup input video
        this.inputVideo.srcObject = inputStream;

        // Wait for video metadata to be loaded
        await new Promise<void>((resolve) => {
            if (this.inputVideo.readyState >= 2) {
                // HAVE_CURRENT_DATA
                resolve();
            } else {
                this.inputVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
            }
        });

        await this.inputVideo.play();

        // Setup canvas dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        // Check for invalid dimensions (0x0 or undefined)
        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            const errorMessage = `[MediaPipe Tasks Vision] Invalid video dimensions: ${videoWidth}x${videoHeight}. Cannot process stream with 0x0 size.`;
            throw new Error(errorMessage);
        }

        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;

        // Reset texture allocation flags when canvas size changes
        this.maskTextureAllocated = false;
        this.backgroundTextureAllocated = false;

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
        }

        // Create output stream
        this.outputStream = this.canvas.captureStream(this.frameRate);

        // Copy audio tracks from the original stream
        for (const audioTrack of inputStream.getAudioTracks()) {
            this.outputStream.addTrack(audioTrack);
        }

        // Don't reset timestamp - keep it monotonic across stream changes
        // MediaPipe requires strictly increasing timestamps, so we use a global timestamp
        // that never resets

        // Start processing loop
        this.processFrame();

        return this.outputStream;
    }
}
