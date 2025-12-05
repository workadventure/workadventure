/**
 * WebGL shader for filtering confidence masks and compositing
 * Applies a clamping filter to sharpen mask edges:
 * - Values below lowThreshold become 0
 * - Values above highThreshold become 1
 * - Values in between are interpolated using smoothstep
 *
 * This shader composites background + foreground using the filtered mask
 * directly from a WebGL texture (from MPMask.getAsWebGLTexture())
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
    // Flip Y for mask texture (MediaPipe uses different coordinate system)
    vec2 maskCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
    float maskValue = texture(u_mask, maskCoord).r;

    // Apply smoothstep filter to sharpen mask edges
    float filteredMask = smoothstep(u_lowThreshold, u_highThreshold, maskValue);

    // Sample background and foreground
    vec4 bgColor = texture(u_background, v_texCoord);
    vec4 fgColor = texture(u_foreground, v_texCoord);

    // Composite: blend between background and foreground based on filtered mask
    // filteredMask = 1 means foreground (person), 0 means background
    fragColor = mix(bgColor, fgColor, filteredMask);
}
`;

export class MaskFilterShader {
    private gl: WebGL2RenderingContext;
    private compositeProgram: WebGLProgram;
    private vao: WebGLVertexArrayObject;

    // Textures for background/foreground
    private backgroundTexture: WebGLTexture;
    private foregroundTexture: WebGLTexture;

    // Uniform locations for composite program
    private compositeMaskUniformLocation: WebGLUniformLocation;
    private compositeBackgroundUniformLocation: WebGLUniformLocation;
    private compositeForegroundUniformLocation: WebGLUniformLocation;
    private compositeLowThresholdUniformLocation: WebGLUniformLocation;
    private compositeHighThresholdUniformLocation: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        // Create composite shader program
        this.compositeProgram = this.createProgram(vertexShaderSource, compositeFragmentShaderSource);

        // Get uniform locations for composite program
        this.compositeMaskUniformLocation = this.getUniformLocation(this.compositeProgram, "u_mask");
        this.compositeBackgroundUniformLocation = this.getUniformLocation(this.compositeProgram, "u_background");
        this.compositeForegroundUniformLocation = this.getUniformLocation(this.compositeProgram, "u_foreground");
        this.compositeLowThresholdUniformLocation = this.getUniformLocation(this.compositeProgram, "u_lowThreshold");
        this.compositeHighThresholdUniformLocation = this.getUniformLocation(this.compositeProgram, "u_highThreshold");

        // Create VAO
        this.vao = this.createVAO(this.compositeProgram);

        // Create textures for background/foreground
        this.backgroundTexture = this.createTexture();
        this.foregroundTexture = this.createTexture();
    }

    private createShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error("Failed to create shader");
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error("Shader compile error: " + info);
        }

        return shader;
    }

    private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();
        if (!program) {
            throw new Error("Failed to create program");
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            throw new Error("Program link error: " + info);
        }

        // Clean up shaders after linking
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
    }

    private getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
        const location = this.gl.getUniformLocation(program, name);
        if (location === null) {
            throw new Error(`Failed to get uniform location for ${name}`);
        }
        return location;
    }

    private createVAO(program: WebGLProgram): WebGLVertexArrayObject {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        if (!vao) {
            throw new Error("Failed to create VAO");
        }

        gl.bindVertexArray(vao);

        // Full screen quad
        const positions = new Float32Array([
            -1,
            -1,
            1,
            -1,
            -1,
            1, // First triangle
            -1,
            1,
            1,
            -1,
            1,
            1, // Second triangle
        ]);

        const texCoords = new Float32Array([
            0,
            0,
            1,
            0,
            0,
            1, // First triangle
            0,
            1,
            1,
            0,
            1,
            1, // Second triangle
        ]);

        // Position buffer
        const positionBuffer = gl.createBuffer();
        if (!positionBuffer) {
            throw new Error("Failed to create position buffer");
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Texture coordinate buffer
        const texCoordBuffer = gl.createBuffer();
        if (!texCoordBuffer) {
            throw new Error("Failed to create texCoord buffer");
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);

        // Delete buffers - VAO keeps internal references to the GPU data
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);

        return vao;
    }

    private createTexture(): WebGLTexture {
        const gl = this.gl;
        const texture = gl.createTexture();
        if (!texture) {
            throw new Error("Failed to create texture");
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return texture;
    }

    /**
     * Draw filtered confidence mask composite directly from a WebGL texture.
     * Takes a mask texture from MPMask.getAsWebGLTexture() and composites
     * background/foreground based on the filtered mask values.
     *
     * @param maskTexture The WebGL texture from MPMask.getAsWebGLTexture()
     * @param background Background image (blurred video or replacement image)
     * @param foreground Foreground image (original video frame)
     * @param lowThreshold Values below this become 0 (default: 0.3)
     * @param highThreshold Values above this become 1 (default: 0.9)
     */
    drawFilteredConfidenceMaskFromTexture(
        maskTexture: WebGLTexture,
        background: TexImageSource,
        foreground: TexImageSource,
        lowThreshold: number = 0.3,
        highThreshold: number = 0.9
    ): void {
        const gl = this.gl;

        // Ensure we render to canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Clear canvas
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Use composite shader program
        gl.useProgram(this.compositeProgram);
        gl.bindVertexArray(this.vao);

        // Bind mask texture to texture unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.uniform1i(this.compositeMaskUniformLocation, 0);

        // Upload background to texture unit 1
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, background);
        gl.uniform1i(this.compositeBackgroundUniformLocation, 1);

        // Upload foreground to texture unit 2
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.foregroundTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, foreground);
        gl.uniform1i(this.compositeForegroundUniformLocation, 2);

        // Set threshold uniforms
        gl.uniform1f(this.compositeLowThresholdUniformLocation, lowThreshold);
        gl.uniform1f(this.compositeHighThresholdUniformLocation, highThreshold);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Reset UNPACK_FLIP_Y_WEBGL
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        gl.bindVertexArray(null);
    }

    /**
     * Clean up WebGL resources
     */
    dispose(): void {
        const gl = this.gl;
        gl.deleteProgram(this.compositeProgram);
        gl.deleteVertexArray(this.vao);
        gl.deleteTexture(this.backgroundTexture);
        gl.deleteTexture(this.foregroundTexture);
    }
}
