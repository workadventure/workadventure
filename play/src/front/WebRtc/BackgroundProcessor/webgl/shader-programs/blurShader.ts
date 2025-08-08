import { createProgram, createShader, glsl } from '../utils';
import { vertexShaderSource } from './vertexShader';

// Define the blur fragment shader
export const blurFragmentShader = glsl`#version 300 es
  precision mediump float;
  in vec2 texCoords;
  uniform sampler2D u_texture;
  uniform vec2 u_texelSize;
  uniform vec2 u_direction;
  uniform float u_radius;
  out vec4 fragColor;

  void main() {
    float sigma = u_radius;
    float twoSigmaSq = 2.0 * sigma * sigma;
    float totalWeight = 0.0;
    vec3 result = vec3(0.0);
    const int MAX_SAMPLES = 16;
    int radius = int(min(float(MAX_SAMPLES), ceil(u_radius)));

    for (int i = -MAX_SAMPLES; i <= MAX_SAMPLES; ++i) {
      float offset = float(i);
      if (abs(offset) > float(radius)) continue;
      float weight = exp(-(offset * offset) / twoSigmaSq);
      vec2 sampleCoord = texCoords + u_direction * u_texelSize * offset;
      result += texture(u_texture, sampleCoord).rgb * weight;
      totalWeight += weight;
    }

    fragColor = vec4(result / totalWeight, 1.0);
  }
`;

export function createBlurProgram(gl: WebGL2RenderingContext) {
  const blurVertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource());
  const blurFrag = createShader(gl, gl.FRAGMENT_SHADER, blurFragmentShader);

  const blurProgram = createProgram(gl, blurVertexShader, blurFrag);

  // Get uniform locations
  const blurUniforms = {
    position: gl.getAttribLocation(blurProgram, 'position'),
    texture: gl.getUniformLocation(blurProgram, 'u_texture'),
    texelSize: gl.getUniformLocation(blurProgram, 'u_texelSize'),
    direction: gl.getUniformLocation(blurProgram, 'u_direction'),
    radius: gl.getUniformLocation(blurProgram, 'u_radius'),
  };

  return {
    program: blurProgram,
    shader: blurFrag,
    vertexShader: blurVertexShader,
    uniforms: blurUniforms,
  };
}

export function applyBlur(
  gl: WebGL2RenderingContext,
  sourceTexture: WebGLTexture,
  width: number,
  height: number,
  blurRadius: number,
  blurProgram: WebGLProgram,
  blurUniforms: any,
  vertexBuffer: WebGLBuffer,
  processFramebuffers: WebGLFramebuffer[],
  processTextures: WebGLTexture[],
) {
  gl.useProgram(blurProgram);

  // Set common attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(blurUniforms.position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(blurUniforms.position);

  const texelWidth = 1.0 / width;
  const texelHeight = 1.0 / height;

  // First pass - horizontal blur
  gl.bindFramebuffer(gl.FRAMEBUFFER, processFramebuffers[0]);
  gl.viewport(0, 0, width, height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
  gl.uniform1i(blurUniforms.texture, 0);
  gl.uniform2f(blurUniforms.texelSize, texelWidth, texelHeight);
  gl.uniform2f(blurUniforms.direction, 1.0, 0.0); // Horizontal
  gl.uniform1f(blurUniforms.radius, blurRadius);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Second pass - vertical blur
  gl.bindFramebuffer(gl.FRAMEBUFFER, processFramebuffers[1]);
  gl.viewport(0, 0, width, height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, processTextures[0]);
  gl.uniform1i(blurUniforms.texture, 0);
  gl.uniform2f(blurUniforms.direction, 0.0, 1.0); // Vertical

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Reset framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return processTextures[1];
}
