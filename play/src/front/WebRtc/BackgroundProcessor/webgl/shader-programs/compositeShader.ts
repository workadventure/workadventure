import { createProgram, createShader, glsl } from '../utils';
import { vertexShaderSource } from './vertexShader';

// Fragment shader source for compositing
export const compositeFragmentShader = glsl`#version 300 es
  precision mediump float;
  in vec2 texCoords;
  uniform sampler2D background;
  uniform sampler2D frame;
  uniform sampler2D mask;
  out vec4 fragColor;
  
  void main() {
      
    vec4 frameTex = texture(frame, texCoords);
    vec4 bgTex = texture(background, texCoords);

    float maskVal = texture(mask, texCoords).r;

    // Compute screen-space gradient to detect edge sharpness
    float grad = length(vec2(dFdx(maskVal), dFdy(maskVal)));

    float edgeSoftness = 2.0; // higher = softer
    
    // Create a smooth edge around binary transition
    float smoothAlpha = smoothstep(0.5 - grad * edgeSoftness, 0.5 + grad * edgeSoftness, maskVal);

    // Optional: preserve frame alpha, or override as fully opaque
    vec4 blended = mix(bgTex, vec4(frameTex.rgb, 1.0), 1.0 - smoothAlpha);
    
    fragColor = blended;
  
  }
`;

/**
 * Create the composite shader program
 */
export function createCompositeProgram(gl: WebGL2RenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource());
  const compositeShader = createShader(gl, gl.FRAGMENT_SHADER, compositeFragmentShader);

  const compositeProgram = createProgram(gl, vertexShader, compositeShader);

  // Get attribute and uniform locations
  const attribLocations = {
    position: gl.getAttribLocation(compositeProgram, 'position'),
  };

  const uniformLocations = {
    mask: gl.getUniformLocation(compositeProgram, 'mask')!,
    frame: gl.getUniformLocation(compositeProgram, 'frame')!,
    background: gl.getUniformLocation(compositeProgram, 'background')!,
    stepWidth: gl.getUniformLocation(compositeProgram, 'u_stepWidth')!,
  };

  return {
    program: compositeProgram,
    vertexShader,
    fragmentShader: compositeShader,
    attribLocations,
    uniformLocations,
  };
}
