/**
 * WebGL shader for filtering confidence masks and compositing
 * Applies a clamping filter to sharpen mask edges:
 * - Values below lowThreshold become 0
 * - Values above highThreshold become 1
 * - Values in between are interpolated using smoothstep
 *
 * This shader can both:
 * 1. Filter a mask texture and output a filtered mask
 * 2. Composite background + foreground using the filtered mask
 */

// Vertex shader - simple passthrough
const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

// Fragment shader - applies the mask filter only
const filterFragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D u_mask;
uniform float u_lowThreshold;
uniform float u_highThreshold;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    // Sample the mask value (assuming grayscale, use red channel)
    float maskValue = texture(u_mask, v_texCoord).r;
    
    // Apply clamping filter with smooth interpolation in between
    // smoothstep(edge0, edge1, x) returns 0 if x < edge0, 1 if x > edge1,
    // and performs smooth Hermite interpolation between 0 and 1 when edge0 < x < edge1
    float filteredValue = smoothstep(u_lowThreshold, u_highThreshold, maskValue);
    
    // Output the filtered mask value
    fragColor = vec4(filteredValue, filteredValue, filteredValue, 1.0);
}
`;

// Fragment shader - composites background and foreground using filtered mask
const compositeFragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D u_mask;
uniform sampler2D u_background;
uniform sampler2D u_foreground;
uniform float u_lowThreshold;
uniform float u_highThreshold;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    // Sample the mask value (mask texture is not flipped, so we flip Y in shader)
    vec2 maskCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
    float maskValue = texture(u_mask, maskCoord).r;
    
    // Apply clamping filter with smooth interpolation
    float alpha = smoothstep(u_lowThreshold, u_highThreshold, maskValue);
    
    // Sample background and foreground (these are flipped via UNPACK_FLIP_Y_WEBGL)
    vec4 bgColor = texture(u_background, v_texCoord);
    vec4 fgColor = texture(u_foreground, v_texCoord);
    
    // Blend based on filtered mask (alpha = 1 means foreground/person)
    fragColor = mix(bgColor, fgColor, alpha);
}
`;

export interface MaskFilterConfig {
    lowThreshold: number; // Values below this become 0 (default: 0.3)
    highThreshold: number; // Values above this become 1 (default: 0.9)
}

export class MaskFilterShader {
    private gl: WebGL2RenderingContext;

    // Filter-only program
    private filterProgram: WebGLProgram | null = null;
    private filterMaskUniformLocation: WebGLUniformLocation | null = null;
    private filterLowThresholdUniformLocation: WebGLUniformLocation | null = null;
    private filterHighThresholdUniformLocation: WebGLUniformLocation | null = null;

    // Composite program
    private compositeProgram: WebGLProgram | null = null;
    private compositeMaskUniformLocation: WebGLUniformLocation | null = null;
    private compositeBackgroundUniformLocation: WebGLUniformLocation | null = null;
    private compositeForegroundUniformLocation: WebGLUniformLocation | null = null;
    private compositeLowThresholdUniformLocation: WebGLUniformLocation | null = null;
    private compositeHighThresholdUniformLocation: WebGLUniformLocation | null = null;

    // Shared buffers
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private filterVao: WebGLVertexArrayObject | null = null;
    private compositeVao: WebGLVertexArrayObject | null = null;

    // Framebuffer for rendering filtered mask
    private framebuffer: WebGLFramebuffer | null = null;
    private filteredMaskTexture: WebGLTexture | null = null;

    // Textures for source images
    private backgroundTexture: WebGLTexture | null = null;
    private foregroundTexture: WebGLTexture | null = null;
    private maskTexture: WebGLTexture | null = null;

    // Current dimensions
    private width = 0;
    private height = 0;

    private config: MaskFilterConfig;

    constructor(gl: WebGL2RenderingContext, config: MaskFilterConfig = { lowThreshold: 0.3, highThreshold: 0.9 }) {
        this.gl = gl;
        this.config = config;

        this.initShaders();
        this.initBuffers();
        this.initTextures();
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error("[MaskFilterShader] Failed to create shader");
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`[MaskFilterShader] Shader compilation failed: ${info}`);
        }
        return shader;
    }

    private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
        const gl = this.gl;
        const program = gl.createProgram();
        if (!program) {
            throw new Error("[MaskFilterShader] Failed to create shader program");
        }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`[MaskFilterShader] Shader program linking failed: ${info}`);
        }
        return program;
    }

    private initShaders(): void {
        const gl = this.gl;

        // Compile shared vertex shader
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);

        // Create filter program
        const filterFragmentShader = this.compileShader(gl.FRAGMENT_SHADER, filterFragmentShaderSource);
        this.filterProgram = this.createProgram(vertexShader, filterFragmentShader);
        gl.deleteShader(filterFragmentShader);

        // Get filter program uniform locations
        this.filterMaskUniformLocation = gl.getUniformLocation(this.filterProgram, "u_mask");
        this.filterLowThresholdUniformLocation = gl.getUniformLocation(this.filterProgram, "u_lowThreshold");
        this.filterHighThresholdUniformLocation = gl.getUniformLocation(this.filterProgram, "u_highThreshold");

        // Create composite program
        const compositeFragmentShader = this.compileShader(gl.FRAGMENT_SHADER, compositeFragmentShaderSource);
        this.compositeProgram = this.createProgram(vertexShader, compositeFragmentShader);
        gl.deleteShader(compositeFragmentShader);

        // Get composite program uniform locations
        this.compositeMaskUniformLocation = gl.getUniformLocation(this.compositeProgram, "u_mask");
        this.compositeBackgroundUniformLocation = gl.getUniformLocation(this.compositeProgram, "u_background");
        this.compositeForegroundUniformLocation = gl.getUniformLocation(this.compositeProgram, "u_foreground");
        this.compositeLowThresholdUniformLocation = gl.getUniformLocation(this.compositeProgram, "u_lowThreshold");
        this.compositeHighThresholdUniformLocation = gl.getUniformLocation(this.compositeProgram, "u_highThreshold");

        // Clean up vertex shader
        gl.deleteShader(vertexShader);
    }

    private initBuffers(): void {
        const gl = this.gl;

        // Position buffer (full-screen quad)
        // prettier-ignore
        const positions = new Float32Array([
            -1, -1,  // bottom-left
             1, -1,  // bottom-right
            -1,  1,  // top-left
             1,  1,  // top-right
        ]);
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Texture coordinate buffer
        // Standard UV coordinates (Y flipping is handled in shader or texture upload)
        // prettier-ignore
        const texCoords = new Float32Array([
            0, 0,  // bottom-left
            1, 0,  // bottom-right
            0, 1,  // top-left
            1, 1,  // top-right
        ]);
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        // Create VAO for filter program
        this.filterVao = gl.createVertexArray();
        gl.bindVertexArray(this.filterVao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const filterPosLoc = gl.getAttribLocation(this.filterProgram!, "a_position");
        gl.enableVertexAttribArray(filterPosLoc);
        gl.vertexAttribPointer(filterPosLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        const filterTexLoc = gl.getAttribLocation(this.filterProgram!, "a_texCoord");
        gl.enableVertexAttribArray(filterTexLoc);
        gl.vertexAttribPointer(filterTexLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);

        // Create VAO for composite program
        this.compositeVao = gl.createVertexArray();
        gl.bindVertexArray(this.compositeVao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const compositePosLoc = gl.getAttribLocation(this.compositeProgram!, "a_position");
        gl.enableVertexAttribArray(compositePosLoc);
        gl.vertexAttribPointer(compositePosLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        const compositeTexLoc = gl.getAttribLocation(this.compositeProgram!, "a_texCoord");
        gl.enableVertexAttribArray(compositeTexLoc);
        gl.vertexAttribPointer(compositeTexLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    private initTextures(): void {
        const gl = this.gl;

        // Create reusable textures
        this.backgroundTexture = gl.createTexture();
        this.foregroundTexture = gl.createTexture();
        this.maskTexture = gl.createTexture();

        // Setup texture parameters for image/video textures
        for (const tex of [this.backgroundTexture, this.foregroundTexture]) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        // Setup texture parameters for mask texture (needs NEAREST for float data)
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    private ensureFramebuffer(width: number, height: number): void {
        const gl = this.gl;

        if (this.width === width && this.height === height && this.framebuffer) {
            return; // Already set up with correct dimensions
        }

        this.width = width;
        this.height = height;

        // Clean up existing resources
        if (this.filteredMaskTexture) {
            gl.deleteTexture(this.filteredMaskTexture);
        }
        if (this.framebuffer) {
            gl.deleteFramebuffer(this.framebuffer);
        }

        // Create texture for filtered mask output
        this.filteredMaskTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.filteredMaskTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Create framebuffer
        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.filteredMaskTexture, 0);

        // Check framebuffer status
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error(`[MaskFilterShader] Framebuffer incomplete: ${status}`);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Upload an image source to a texture
     */
    private uploadTexture(texture: WebGLTexture, source: TexImageSource): void {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Flip Y for canvas/video sources to match WebGL coordinate system
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    /**
     * Composite using a WebGL texture mask (from MPMask.getAsWebGLTexture())
     *
     * @param maskTexture WebGL texture containing the confidence mask
     * @param background Background image source (shown where mask is low)
     * @param foreground Foreground image source (shown where mask is high, i.e., the person)
     * @param width Width of the output
     * @param height Height of the output
     */
    public drawFilteredConfidenceMaskFromTexture(
        maskTexture: WebGLTexture,
        background: TexImageSource,
        foreground: TexImageSource,
        width: number,
        height: number
    ): void {
        const gl = this.gl;

        // Save current WebGL state
        const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

        // Ensure we render to the default framebuffer (canvas)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Upload background and foreground textures
        this.uploadTexture(this.backgroundTexture!, background);
        this.uploadTexture(this.foregroundTexture!, foreground);

        // Use composite shader program
        gl.useProgram(this.compositeProgram);

        // Bind textures to texture units
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture); // Use the mask texture directly
        gl.uniform1i(this.compositeMaskUniformLocation, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
        gl.uniform1i(this.compositeBackgroundUniformLocation, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.foregroundTexture);
        gl.uniform1i(this.compositeForegroundUniformLocation, 2);

        // Set threshold uniforms
        gl.uniform1f(this.compositeLowThresholdUniformLocation, this.config.lowThreshold);
        gl.uniform1f(this.compositeHighThresholdUniformLocation, this.config.highThreshold);

        // Set viewport to canvas size
        gl.viewport(0, 0, width, height);

        // Clear and draw
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw full-screen quad
        gl.bindVertexArray(this.compositeVao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Restore WebGL state
        gl.bindVertexArray(previousVao);
        gl.useProgram(previousProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
        gl.activeTexture(gl.TEXTURE0);
    }

    /**
     * Update filter configuration
     */
    public updateConfig(config: Partial<MaskFilterConfig>): void {
        if (config.lowThreshold !== undefined) {
            this.config.lowThreshold = config.lowThreshold;
        }
        if (config.highThreshold !== undefined) {
            this.config.highThreshold = config.highThreshold;
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): MaskFilterConfig {
        return { ...this.config };
    }

    /**
     * Clean up WebGL resources
     */
    public close(): void {
        const gl = this.gl;

        if (this.framebuffer) {
            gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null;
        }
        if (this.filteredMaskTexture) {
            gl.deleteTexture(this.filteredMaskTexture);
            this.filteredMaskTexture = null;
        }
        if (this.backgroundTexture) {
            gl.deleteTexture(this.backgroundTexture);
            this.backgroundTexture = null;
        }
        if (this.foregroundTexture) {
            gl.deleteTexture(this.foregroundTexture);
            this.foregroundTexture = null;
        }
        if (this.maskTexture) {
            gl.deleteTexture(this.maskTexture);
            this.maskTexture = null;
        }
        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
            this.positionBuffer = null;
        }
        if (this.texCoordBuffer) {
            gl.deleteBuffer(this.texCoordBuffer);
            this.texCoordBuffer = null;
        }
        if (this.filterVao) {
            gl.deleteVertexArray(this.filterVao);
            this.filterVao = null;
        }
        if (this.compositeVao) {
            gl.deleteVertexArray(this.compositeVao);
            this.compositeVao = null;
        }
        if (this.filterProgram) {
            gl.deleteProgram(this.filterProgram);
            this.filterProgram = null;
        }
        if (this.compositeProgram) {
            gl.deleteProgram(this.compositeProgram);
            this.compositeProgram = null;
        }
    }
}
