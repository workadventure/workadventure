// Import TensorFlow.js and BodyPix
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';
//import '../../types/webrtc-insertable-streams';

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export interface PerformanceConfig {
    targetFPS?: number;
    segmentationInterval?: number;
    adaptiveQuality?: boolean;
    maxProcessingTime?: number;
    useWebGL2?: boolean;
}

/**
 * Optimized background transformer using TensorFlow.js WASM for segmentation
 * and WebGL2 for rendering, providing better performance than MediaPipe
 */
export class OptimizedBackgroundTransformer {
    private model: bodyPix.BodyPix | undefined;
    private processor: any; // MediaStreamTrackProcessor instance
    private generator: any; // MediaStreamTrackGenerator instance
    private outputTrack: MediaStreamTrack;
    private closed = false;
    private config: BackgroundConfig;
    private perfConfig: PerformanceConfig;
    
    // WebGL2 rendering
    private gl: WebGL2RenderingContext | null = null;
    private glProgram: WebGLProgram | null = null;
    private glTextures: Map<string, WebGLTexture> = new Map();
    
    // Canvas fallback
    private canvas: OffscreenCanvas;
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    
    // Performance tracking
    private frameCount = 0;
    private segmentationSkipCounter = 0;
    private lastSegmentationMask: Float32Array | null = null;
    private processingSegmentation = false;
    private lastFrameTime = 0;
    private frameTimeHistory: number[] = [];
    private currentScale = 1.0;
    
    // Resource management
    private backgroundImageBitmap: ImageBitmap | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    
    // Shader sources
    private readonly vertexShaderSource = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }`;
    
    private readonly fragmentShaderSource = `#version 300 es
        precision highp float;
        
        uniform sampler2D u_frame;
        uniform sampler2D u_mask;
        uniform sampler2D u_background;
        uniform float u_blurRadius;
        uniform int u_mode; // 0=none, 1=blur, 2=image, 3=video
        uniform float u_threshold;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        vec4 gaussianBlur(sampler2D tex, vec2 coord, float radius) {
            vec4 color = vec4(0.0);
            float total = 0.0;
            
            for (float x = -4.0; x <= 4.0; x += 1.0) {
                for (float y = -4.0; y <= 4.0; y += 1.0) {
                    float weight = exp(-(x*x + y*y) / (2.0 * radius * radius));
                    vec2 offset = vec2(x, y) / vec2(textureSize(tex, 0));
                    color += texture(tex, coord + offset) * weight;
                    total += weight;
                }
            }
            
            return color / total;
        }
        
        void main() {
            vec4 frameColor = texture(u_frame, v_texCoord);
            float maskValue = texture(u_mask, v_texCoord).r;
            
            // Smooth mask edges
            float alpha = smoothstep(u_threshold - 0.1, u_threshold + 0.1, maskValue);
            
            if (u_mode == 0) { // none
                fragColor = frameColor;
            } else if (u_mode == 1) { // blur
                vec4 blurred = gaussianBlur(u_frame, v_texCoord, u_blurRadius);
                fragColor = mix(blurred, frameColor, alpha);
            } else if (u_mode >= 2) { // image or video
                vec4 bgColor = texture(u_background, v_texCoord);
                fragColor = mix(bgColor, frameColor, alpha);
            }
        }`;

    constructor(private inputTrack: MediaStreamTrack, config: BackgroundConfig, perfConfig?: PerformanceConfig) {
        this.config = config;
        this.perfConfig = {
            targetFPS: 24,
            segmentationInterval: 3,
            adaptiveQuality: true,
            maxProcessingTime: 25,
            useWebGL2: true,
            ...perfConfig
        };
        
        if (this.inputTrack.kind !== 'video') {
            throw new Error('Input track must be a video track');
        }
        
                this.processor = new (MediaStreamTrackProcessor as any)({ 
            track: this.inputTrack
        });
        this.generator = new (MediaStreamTrackGenerator as any)({ kind: "video" });
        this.outputTrack = this.generator;
        
        const { width, height } = this.inputTrack.getSettings();
        this.canvas = new OffscreenCanvas(width || 640, height || 480);
        
        void this.init();
    }
    
    public get track(): MediaStreamTrack {
        return this.outputTrack;
    }
    
    private async loadTensorFlow() {
        // TensorFlow.js is now loaded via npm, no need for dynamic loading
        return;
    }
    
    private async init() {
        console.log('[OptimizedBackgroundTransformer] Starting initialization...');
        console.log('[OptimizedBackgroundTransformer] Config:', this.config);
        try {
            // Check if MediaStreamTrackProcessor is available
            if (typeof MediaStreamTrackProcessor === 'undefined') {
                console.error('[OptimizedBackgroundTransformer] MediaStreamTrackProcessor API not available. This feature requires Chrome 94+');
                throw new Error('MediaStreamTrackProcessor not supported');
            }
            
            // Load TensorFlow.js from CDN
            console.log('[OptimizedBackgroundTransformer] Loading TensorFlow.js...');
            await this.loadTensorFlow();
            
            // Initialize TensorFlow.js with WebGL backend for better performance
            console.log('[OptimizedBackgroundTransformer] Initializing TensorFlow.js backend...');
            await tf.setBackend('webgl');
            await tf.ready();
            console.log('[OptimizedBackgroundTransformer] TensorFlow.js ready with backend:', tf.getBackend());
            
            // Load BodyPix model
            // Using a lightweight MobileNet version for better performance
            console.log('[OptimizedBackgroundTransformer] Loading BodyPix model...');
            this.model = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });
            console.log('[OptimizedBackgroundTransformer] BodyPix model loaded successfully');
            
            // Initialize rendering context
            if (this.perfConfig.useWebGL2) {
                await this.initWebGL2();
            }
            
            if (!this.gl) {
                this.initCanvas2D();
            }
            
            // Load background assets
            if (this.config.backgroundImage) {
                await this.loadBackgroundImage(this.config.backgroundImage);
            }
            if (this.config.backgroundVideo) {
                await this.loadBackgroundVideo(this.config.backgroundVideo);
            }
            
            // Start processing
            console.log('[OptimizedBackgroundTransformer] Starting frame processing with mode:', this.config.mode);
            void this.processFrames();
            
        } catch (error) {
            console.error('[OptimizedBackgroundTransformer] Initialization failed:', error);
            // Fallback to pass-through mode
            this.config.mode = "none";
            console.warn('[OptimizedBackgroundTransformer] Fallback to pass-through mode');
            void this.processFrames();
        }
    }
    
    private async initWebGL2() {
        try {
            const gl = this.canvas.getContext('webgl2', {
                alpha: false,
                desynchronized: true,
                powerPreference: 'high-performance'
            });
            
            if (!gl) {
                console.warn('WebGL2 not available, falling back to Canvas 2D');
                return;
            }
            
            this.gl = gl;
            
            // Create and compile shaders
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
            
            if (!vertexShader || !fragmentShader) {
                throw new Error('Failed to create shaders');
            }
            
            // Create program
            const program = gl.createProgram();
            if (!program) throw new Error('Failed to create WebGL program');
            
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error('Failed to link program: ' + gl.getProgramInfoLog(program));
            }
            
            this.glProgram = program;
            
            // Set up geometry
            const positions = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1,
            ]);
            
            const texCoords = new Float32Array([
                0, 1,
                1, 1,
                0, 0,
                1, 0,
            ]);
            
            // Create buffers
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            
            const positionLocation = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            
            const texCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
            
            const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
            gl.enableVertexAttribArray(texCoordLocation);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
            
        } catch (error) {
            console.warn('WebGL2 initialization failed:', error);
            this.gl = null;
        }
    }
    
    private createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    private initCanvas2D() {
        const ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
        });
        
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        
        this.ctx = ctx;
    }
    
    private async loadBackgroundImage(url: string) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            
            this.backgroundImageBitmap = await createImageBitmap(img);
            
            // Upload to WebGL if available
            if (this.gl && this.backgroundImageBitmap) {
                this.uploadTextureFromBitmap('background', this.backgroundImageBitmap);
            }
        } catch (error) {
            console.warn('Failed to load background image:', error);
        }
    }
    
    private async loadBackgroundVideo(url: string) {
        try {
            const video = document.createElement('video');
            video.src = url;
            video.loop = true;
            video.muted = true;
            video.crossOrigin = 'anonymous';
            
            await video.play();
            this.backgroundVideo = video;
        } catch (error) {
            console.warn('Failed to load background video:', error);
        }
    }
    
    private uploadTextureFromBitmap(name: string, bitmap: ImageBitmap) {
        if (!this.gl) return;
        
        const gl = this.gl;
        let texture = this.glTextures.get(name);
        
        if (!texture) {
            texture = gl.createTexture();
            if (!texture) return;
            this.glTextures.set(name, texture);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.generateMipmap(gl.TEXTURE_2D);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    private async processFrames() {
        const reader = this.processor.readable.getReader();
        const writer = this.generator.writable.getWriter();
        
        try {
            while (!this.closed) {
                const result = await reader.read();
                if (result.done || !result.value) break;
                
                const frame = result.value;
                await this.processFrame(frame, writer);
            }
        } finally {
            reader.releaseLock();
            writer.releaseLock();
            await this.generator.writable.close();
        }
    }
    
    private async processFrame(frame: VideoFrame, writer: WritableStreamDefaultWriter<VideoFrame>) {
        const startTime = performance.now();
        
        // FPS throttling
        const timeSinceLastFrame = startTime - this.lastFrameTime;
        const targetFrameTime = 1000 / this.perfConfig.targetFPS!;
        
        if (timeSinceLastFrame < targetFrameTime) {
            frame.close();
            return;
        }
        
        // Log first frame processing
        if (this.frameCount === 0) {
            console.log('[OptimizedBackgroundTransformer] Processing first frame with mode:', this.config.mode);
        }
        
        try {
            // Adaptive quality based on performance
            if (this.perfConfig.adaptiveQuality) {
                this.updateQualityScale();
            }
            
            // Process segmentation at intervals
            this.segmentationSkipCounter++;
            if (this.segmentationSkipCounter >= this.perfConfig.segmentationInterval! && 
                !this.processingSegmentation && 
                this.model && 
                this.config.mode !== "none") {
                
                if (this.frameCount < 5) {
                    console.log('[OptimizedBackgroundTransformer] Running segmentation on frame', this.frameCount);
                }
                
                this.segmentationSkipCounter = 0;
                this.processingSegmentation = true;
                
                // Run segmentation asynchronously
                void this.runSegmentation(frame).then(mask => {
                    this.lastSegmentationMask = mask;
                    this.processingSegmentation = false;
                }).catch(err => {
                    console.warn('Segmentation failed:', err);
                    this.processingSegmentation = false;
                });
            }
            
            // Render frame
            if (this.gl && this.glProgram) {
                await this.renderWithWebGL2(frame);
            } else if (this.ctx) {
                await this.renderWithCanvas2D(frame);
            } else {
                throw new Error('No rendering context available');
            }
            
            const processedFrame = new VideoFrame(this.canvas, {
                timestamp: frame.timestamp,
            });
            
            await writer.write(processedFrame);
            frame.close();
            processedFrame.close();
            
            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.updatePerformanceMetrics(processingTime);
            this.lastFrameTime = startTime;
            
        } catch (err) {
            console.error('Frame processing failed:', err);
            frame.close();
        }
    }
    
    private async runSegmentation(frame: VideoFrame): Promise<Float32Array> {
        if (!this.model) throw new Error('Model not loaded');
        
        try {
            // Create a temporary canvas to draw the video frame
            const tempCanvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) throw new Error('Failed to get 2D context');
            
            tempCtx.drawImage(frame, 0, 0);
            
            // Run BodyPix segmentation
            const segmentation = await this.model.segmentPerson(tempCanvas as any, {
                flipHorizontal: false,
                internalResolution: this.currentScale < 1.0 ? 'low' : 'medium',
                segmentationThreshold: 0.7,
                maxDetections: 1,
                scoreThreshold: 0.3,
                nmsRadius: 20
            });
            
            // Convert binary mask to Float32Array
            const maskData = segmentation.data;
            const float32Mask = new Float32Array(maskData.length);
            
            for (let i = 0; i < maskData.length; i++) {
                float32Mask[i] = maskData[i] ? 1.0 : 0.0;
            }
            
            return float32Mask;
        } catch (error) {
            console.warn('Segmentation failed:', error);
            // Return a mask that shows everything (fallback)
            return new Float32Array(frame.displayWidth * frame.displayHeight).fill(1.0);
        }
    }
    
    private async renderWithWebGL2(frame: VideoFrame) {
        if (!this.gl || !this.glProgram) return;
        
        const gl = this.gl;
        gl.useProgram(this.glProgram);
        
        // Upload frame texture
        this.uploadVideoFrame(frame);
        
        // Upload mask texture if available
        if (this.lastSegmentationMask) {
            this.uploadMaskTexture(this.lastSegmentationMask, frame.displayWidth, frame.displayHeight);
        }
        
        // Set uniforms
        const modeLocation = gl.getUniformLocation(this.glProgram, 'u_mode');
        const blurRadiusLocation = gl.getUniformLocation(this.glProgram, 'u_blurRadius');
        const thresholdLocation = gl.getUniformLocation(this.glProgram, 'u_threshold');
        
        let mode = 0; // none
        if (this.config.mode === 'blur') mode = 1;
        else if (this.config.mode === 'image') mode = 2;
        else if (this.config.mode === 'video') mode = 3;
        
        gl.uniform1i(modeLocation, mode);
        gl.uniform1f(blurRadiusLocation, this.config.blurAmount || 10);
        gl.uniform1f(thresholdLocation, 0.5);
        
        // Bind textures
        const frameTexture = this.glTextures.get('frame');
        const maskTexture = this.glTextures.get('mask');
        const bgTexture = this.glTextures.get('background');
        
        if (frameTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, frameTexture);
            const frameLocation = gl.getUniformLocation(this.glProgram, 'u_frame');
            gl.uniform1i(frameLocation, 0);
        }
        
        if (maskTexture) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            const maskLocation = gl.getUniformLocation(this.glProgram, 'u_mask');
            gl.uniform1i(maskLocation, 1);
        }
        
        if (bgTexture && (this.config.mode === 'image' || this.config.mode === 'video')) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, bgTexture);
            const bgLocation = gl.getUniformLocation(this.glProgram, 'u_background');
            gl.uniform1i(bgLocation, 2);
        }
        
        // Draw
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    private uploadVideoFrame(frame: VideoFrame) {
        if (!this.gl) return;
        
        const gl = this.gl;
        let texture = this.glTextures.get('frame');
        
        if (!texture) {
            texture = gl.createTexture();
            if (!texture) return;
            this.glTextures.set('frame', texture);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame as any);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    private uploadMaskTexture(mask: Float32Array, width: number, height: number) {
        if (!this.gl) return;
        
        const gl = this.gl;
        let texture = this.glTextures.get('mask');
        
        if (!texture) {
            texture = gl.createTexture();
            if (!texture) return;
            this.glTextures.set('mask', texture);
        }
        
        // Convert Float32Array to Uint8Array for texture upload
        const uint8Mask = new Uint8Array(mask.length);
        for (let i = 0; i < mask.length; i++) {
            uint8Mask[i] = Math.round(mask[i] * 255);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uint8Mask);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    private async renderWithCanvas2D(frame: VideoFrame) {
        if (!this.ctx) return;
        
        const { width, height } = this.canvas;
        
        // Fast path for no processing
        if (this.config.mode === 'none' || !this.lastSegmentationMask) {
            this.ctx.drawImage(frame, 0, 0, width, height);
            return;
        }
        
        // Create temporary canvas for compositing
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        if (this.config.mode === 'blur') {
            // Draw blurred background
            this.ctx.filter = `blur(${this.config.blurAmount || 10}px)`;
            this.ctx.drawImage(frame, 0, 0, width, height);
            this.ctx.filter = 'none';
            
            // Draw sharp person
            tempCtx.drawImage(frame, 0, 0, width, height);
            
            // Apply mask
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            for (let i = 0; i < this.lastSegmentationMask.length; i++) {
                const alpha = this.lastSegmentationMask[i] > 0.5 ? 255 : 0;
                pixels[i * 4 + 3] = alpha;
            }
            
            tempCtx.putImageData(imageData, 0, 0);
            this.ctx.drawImage(tempCanvas, 0, 0, width, height);
            
        } else if (this.config.mode === 'image' && this.backgroundImageBitmap) {
            // Draw background image
            this.ctx.drawImage(this.backgroundImageBitmap, 0, 0, width, height);
            
            // Draw person with mask
            tempCtx.drawImage(frame, 0, 0, width, height);
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            for (let i = 0; i < this.lastSegmentationMask.length; i++) {
                const alpha = this.lastSegmentationMask[i] > 0.5 ? 255 : 0;
                pixels[i * 4 + 3] = alpha;
            }
            
            tempCtx.putImageData(imageData, 0, 0);
            this.ctx.drawImage(tempCanvas, 0, 0, width, height);
        }
    }
    
    private updateQualityScale() {
        const avgTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        
        if (avgTime > this.perfConfig.maxProcessingTime!) {
            this.currentScale = Math.max(0.5, this.currentScale - 0.05);
        } else if (avgTime < this.perfConfig.maxProcessingTime! * 0.7) {
            this.currentScale = Math.min(1.0, this.currentScale + 0.02);
        }
    }
    
    private updatePerformanceMetrics(processingTime: number) {
        this.frameTimeHistory.push(processingTime);
        if (this.frameTimeHistory.length > 30) {
            this.frameTimeHistory.shift();
        }
        this.frameCount++;
    }
    
    public updateConfig(newConfig: Partial<BackgroundConfig>) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.backgroundImage) {
            void this.loadBackgroundImage(newConfig.backgroundImage);
        }
        if (newConfig.backgroundVideo) {
            void this.loadBackgroundVideo(newConfig.backgroundVideo);
        }
    }
    
    public getPerformanceStats() {
        const avgFrameTime = this.frameTimeHistory.length > 0
            ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
            : 0;
        
        return {
            frameCount: this.frameCount,
            avgFrameTimeMs: avgFrameTime,
            currentFPS: avgFrameTime > 0 ? 1000 / avgFrameTime : 0,
            renderingMode: this.gl ? 'WebGL2' : 'Canvas2D',
            qualityScale: this.currentScale,
            hasSegmentation: !!this.lastSegmentationMask
        };
    }
    
    public close() {
        this.closed = true;
        
        // Clean up WebGL resources
        if (this.gl) {
            this.glTextures.forEach(texture => {
                this.gl!.deleteTexture(texture);
            });
            this.glTextures.clear();
            
            if (this.glProgram) {
                this.gl.deleteProgram(this.glProgram);
            }
        }
        
        // Clean up tracks
        this.inputTrack.stop();
        this.outputTrack.stop();
        
        // Clean up resources
        this.backgroundImageBitmap = null;
        this.backgroundVideo = null;
        this.lastSegmentationMask = null;
        
        // Dispose BodyPix model
        if (this.model) {
            this.model.dispose();
        }
    }
}