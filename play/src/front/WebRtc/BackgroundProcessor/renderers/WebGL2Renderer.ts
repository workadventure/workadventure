import { IRenderer, BackgroundConfig } from '../interfaces/BackgroundProcessor';

/**
 * WebGL2 renderer implementation
 * Follows Single Responsibility Principle - only handles WebGL2 rendering
 */
export class WebGL2Renderer implements IRenderer {
    private gl: WebGL2RenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private textures: Map<string, WebGLTexture> = new Map();
    private backgroundImageBitmap: ImageBitmap | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    
    // Shader sources as constants
    private static readonly VERTEX_SHADER = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }`;
    
    private static readonly FRAGMENT_SHADER = `#version 300 es
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
            
            // Smooth mask edges for better quality
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
    
    async initialize(canvas: OffscreenCanvas): Promise<boolean> {
        try {
            const gl = canvas.getContext('webgl2', {
                alpha: false,
                desynchronized: true,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: false
            });
            
            if (!gl) {
                return false;
            }
            
            this.gl = gl;
            
            // Create and compile shaders
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, WebGL2Renderer.VERTEX_SHADER);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, WebGL2Renderer.FRAGMENT_SHADER);
            
            if (!vertexShader || !fragmentShader) {
                this.dispose();
                return false;
            }
            
            // Create program
            const program = gl.createProgram();
            if (!program) {
                this.dispose();
                return false;
            }
            
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Failed to link program:', gl.getProgramInfoLog(program));
                this.dispose();
                return false;
            }
            
            this.program = program;
            
            // Clean up shaders after linking
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            
            // Set up geometry
            this.setupGeometry(gl, program);
            
            return true;
        } catch (error) {
            console.error('WebGL2 initialization failed:', error);
            this.dispose();
            return false;
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
    
    private setupGeometry(gl: WebGL2RenderingContext, program: WebGLProgram): void {
        // Vertex data
        const positions = new Float32Array([
            -1, -1,  // Bottom left
             1, -1,  // Bottom right
            -1,  1,  // Top left
             1,  1,  // Top right
        ]);
        
        const texCoords = new Float32Array([
            0, 1,  // Bottom left
            1, 1,  // Bottom right
            0, 0,  // Top left
            1, 0,  // Top right
        ]);
        
        // Create and bind buffers
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
    }
    
    async render(frame: VideoFrame, mask: Float32Array | null, config: BackgroundConfig): Promise<void> {
        if (!this.gl || !this.program) {
            throw new Error('WebGL2 not initialized');
        }
        
        const gl = this.gl;
        gl.useProgram(this.program);
        
        // Upload frame texture
        this.uploadVideoFrame(frame);
        
        // Upload mask if available
        if (mask && config.mode !== 'none') {
            this.uploadMask(mask, frame.displayWidth, frame.displayHeight);
        }
        
        // Update background if needed
        if (config.mode === 'video' && this.backgroundVideo) {
            this.uploadVideoBackground();
        }
        
        // Set uniforms
        this.setUniforms(config);
        
        // Bind textures
        this.bindTextures(config);
        
        // Draw
        gl.viewport(0, 0, frame.displayWidth, frame.displayHeight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    private uploadVideoFrame(frame: VideoFrame): void {
        if (!this.gl) return;
        
        const texture = this.getOrCreateTexture('frame');
        if (!texture) return;
        
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame as any);
        this.setTextureParameters(gl);
    }
    
    private uploadMask(mask: Float32Array, width: number, height: number): void {
        if (!this.gl) return;
        
        const texture = this.getOrCreateTexture('mask');
        if (!texture) return;
        
        const gl = this.gl;
        
        // Convert Float32Array to Uint8Array
        const uint8Mask = new Uint8Array(mask.length);
        for (let i = 0; i < mask.length; i++) {
            uint8Mask[i] = Math.round(mask[i] * 255);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uint8Mask);
        this.setTextureParameters(gl);
    }
    
    private uploadVideoBackground(): void {
        if (!this.gl || !this.backgroundVideo) return;
        
        const texture = this.getOrCreateTexture('background');
        if (!texture) return;
        
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.backgroundVideo);
        this.setTextureParameters(gl);
    }
    
    private getOrCreateTexture(name: string): WebGLTexture | null {
        if (!this.gl) return null;
        
        let texture = this.textures.get(name);
        if (!texture) {
            texture = this.gl.createTexture();
            if (!texture) return null;
            this.textures.set(name, texture);
        }
        
        return texture;
    }
    
    private setTextureParameters(gl: WebGL2RenderingContext): void {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    private setUniforms(config: BackgroundConfig): void {
        if (!this.gl || !this.program) return;
        
        const gl = this.gl;
        
        // Mode mapping
        const modeMap: Record<string, number> = {
            'none': 0,
            'blur': 1,
            'image': 2,
            'video': 3
        };
        
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_mode'), modeMap[config.mode] || 0);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_blurRadius'), config.blurAmount || 10);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_threshold'), 0.5);
    }
    
    private bindTextures(config: BackgroundConfig): void {
        if (!this.gl || !this.program) return;
        
        const gl = this.gl;
        
        // Frame texture
        const frameTexture = this.textures.get('frame');
        if (frameTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, frameTexture);
            gl.uniform1i(gl.getUniformLocation(this.program, 'u_frame'), 0);
        }
        
        // Mask texture
        const maskTexture = this.textures.get('mask');
        if (maskTexture && config.mode !== 'none') {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            gl.uniform1i(gl.getUniformLocation(this.program, 'u_mask'), 1);
        }
        
        // Background texture
        const bgTexture = this.textures.get('background');
        if (bgTexture && (config.mode === 'image' || config.mode === 'video')) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, bgTexture);
            gl.uniform1i(gl.getUniformLocation(this.program, 'u_background'), 2);
        }
    }
    
    async updateBackground(config: BackgroundConfig): Promise<void> {
        // Load background image
        if (config.backgroundImage) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = config.backgroundImage!;
                });
                
                this.backgroundImageBitmap = await createImageBitmap(img);
                
                if (this.gl && this.backgroundImageBitmap) {
                    const texture = this.getOrCreateTexture('background');
                    if (texture) {
                        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.backgroundImageBitmap);
                        this.gl.generateMipmap(this.gl.TEXTURE_2D);
                        this.setTextureParameters(this.gl);
                    }
                }
            } catch (error) {
                console.warn('Failed to load background image:', error);
            }
        }
        
        // Load background video
        if (config.backgroundVideo) {
            try {
                const video = document.createElement('video');
                video.src = config.backgroundVideo;
                video.loop = true;
                video.muted = true;
                video.crossOrigin = 'anonymous';
                
                await video.play();
                this.backgroundVideo = video;
            } catch (error) {
                console.warn('Failed to load background video:', error);
            }
        }
    }
    
    dispose(): void {
        if (this.gl) {
            // Delete textures
            this.textures.forEach(texture => {
                this.gl!.deleteTexture(texture);
            });
            this.textures.clear();
            
            // Delete program
            if (this.program) {
                this.gl.deleteProgram(this.program);
                this.program = null;
            }
            
            this.gl = null;
        }
        
        // Clean up resources
        this.backgroundImageBitmap = null;
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo = null;
        }
    }
}
