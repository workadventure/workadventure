// Vertex shader source
export const vertexShaderSource = (flipY: boolean = true) => `#version 300 es
  in vec2 position;
  out vec2 texCoords;

  void main() {
    texCoords = (position + 1.0) / 2.0;
    texCoords.y = ${flipY ? '1.0 - texCoords.y' : 'texCoords.y'};
    gl_Position = vec4(position, 0, 1.0);
  }
`;
