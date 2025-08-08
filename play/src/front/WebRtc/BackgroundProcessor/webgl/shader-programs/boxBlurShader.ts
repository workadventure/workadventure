import { createProgram, createShader, glsl } from '../utils';
import { vertexShaderSource } from './vertexShader';

export const boxBlurFragmentShader = glsl`#version 300 es
precision mediump float;

in vec2 texCoords;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;    // 1.0 / texture size
uniform vec2 u_direction;    // (1.0, 0.0) for horizontal, (0.0, 1.0) for vertical
uniform float u_radius;      // blur radius in texels

out vec4 fragColor;

void main() {
    vec3 sum = vec3(0.0);
    float count = 0.0;

    // Limit radius to avoid excessive loop cost
    const int MAX_RADIUS = 16;
    int radius = int(min(float(MAX_RADIUS), u_radius));

    for (int i = -MAX_RADIUS; i <= MAX_RADIUS; ++i) {
        if (abs(i) > radius) continue;

        vec2 offset = u_direction * u_texelSize * float(i);
        sum += texture(u_texture, texCoords + offset).rgb;
        count += 1.0;
  }

  fragColor = vec4(sum / count, 1.0);
}
`;

/**
 * Create the box blur shader program
 */
export function createBoxBlurProgram(gl: WebGL2RenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource());
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, boxBlurFragmentShader);

  const program = createProgram(gl, vertexShader, fragmentShader);

  // Get attribute and uniform locations
  const uniforms = {
    position: gl.getAttribLocation(program, 'position'),
    texture: gl.getUniformLocation(program, 'u_texture'),
    texelSize: gl.getUniformLocation(program, 'u_texelSize'),
    direction: gl.getUniformLocation(program, 'u_direction'),
    radius: gl.getUniformLocation(program, 'u_radius'),
  };

  return {
    program,
    vertexShader,
    fragmentShader,
    uniforms,
  };
}
