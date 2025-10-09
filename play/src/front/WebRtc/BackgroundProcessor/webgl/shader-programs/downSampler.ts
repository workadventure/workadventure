import { createProgram, createShader } from '../utils';

export function createDownSampler(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  program: WebGLProgram;
  uniforms: any;
} {
  // Create texture
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create framebuffer
  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Create shader program for copying
  const vertexSource = `
      attribute vec2 position;
      varying vec2 v_uv;
      void main() {
        v_uv = (position + 1.0) * 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

  const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      void main() {
        gl_FragColor = texture2D(u_texture, v_uv);
      }
    `;

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(gl, vertShader, fragShader);

  const uniforms = {
    texture: gl.getUniformLocation(program, 'u_texture'),
    position: gl.getAttribLocation(program, 'position'),
  };

  return {
    framebuffer,
    texture,
    program,
    uniforms,
  };
}

export function applyDownsampling(
  gl: WebGL2RenderingContext,
  inputTexture: WebGLTexture,
  downSampler: {
    framebuffer: WebGLFramebuffer;
    texture: WebGLTexture;
    program: WebGLProgram;
    uniforms: any;
  },
  vertexBuffer: WebGLBuffer,
  width: number,
  height: number,
): WebGLTexture {
  gl.useProgram(downSampler.program);

  gl.bindFramebuffer(gl.FRAMEBUFFER, downSampler.framebuffer);
  gl.viewport(0, 0, width, height);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(downSampler.uniforms.position);
  gl.vertexAttribPointer(downSampler.uniforms.position, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, inputTexture);
  gl.uniform1i(downSampler.uniforms.texture, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return downSampler.texture;
}
