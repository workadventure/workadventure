/**
 * Initialize a WebGL texture
 */
export function initTexture(gl: WebGL2RenderingContext, texIndex: number) {
  const texRef = gl.TEXTURE0 + texIndex;
  gl.activeTexture(texRef);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  return texture;
}

export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw new Error('Shader compile failed');
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link failed:', gl.getProgramInfoLog(program));
    throw new Error('Program link failed');
  }
  return program;
}

/**
 * Create a WebGL framebuffer with the given texture as color attachment
 */
export function createFramebuffer(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  width: number,
  height: number,
) {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Set the texture as the color attachment
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Ensure texture dimensions match the provided width and height
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  // Check if framebuffer is complete
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer not complete');
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return framebuffer;
}

/**
 * Create a vertex buffer for a full-screen quad
 */
export function createVertexBuffer(gl: WebGL2RenderingContext): WebGLBuffer | null {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]),
    gl.STATIC_DRAW,
  );
  return vertexBuffer;
}

/**
 * Resizes and crops an image to cover a target canvas while maintaining aspect ratio
 * @param image The source image
 * @param targetWidth The target width
 * @param targetHeight The target height
 * @returns A cropped and resized ImageBitmap
 */
export async function resizeImageToCover(
  image: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageBitmap> {
  // Calculate dimensions and crop for "cover" mode
  const imgAspect = image.width / image.height;
  const targetAspect = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = image.width;
  let sHeight = image.height;

  // For cover mode, we need to crop some parts of the image
  // to ensure it covers the canvas while maintaining aspect ratio
  if (imgAspect > targetAspect) {
    // Image is wider than target - crop the sides
    sWidth = Math.round(image.height * targetAspect);
    sx = Math.round((image.width - sWidth) / 2); // Center the crop horizontally
  } else if (imgAspect < targetAspect) {
    // Image is taller than target - crop the top/bottom
    sHeight = Math.round(image.width / targetAspect);
    sy = Math.round((image.height - sHeight) / 2); // Center the crop vertically
  }

  // Create a new ImageBitmap with the cropped portion
  return createImageBitmap(image, sx, sy, sWidth, sHeight, {
    resizeWidth: targetWidth,
    resizeHeight: targetHeight,
    resizeQuality: 'medium',
  });
}

let emptyImageData: ImageData | undefined;

function getEmptyImageData() {
  if (!emptyImageData) {
    emptyImageData = new ImageData(2, 2);
    emptyImageData.data[0] = 0;
    emptyImageData.data[1] = 0;
    emptyImageData.data[2] = 0;
    emptyImageData.data[3] = 0;
  }

  return emptyImageData;
}

const glsl = (source: any) => source;

export { getEmptyImageData, glsl };
