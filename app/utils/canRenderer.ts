import { renderBudget } from './renderBudget.ts'
import { configureTextFont, type TextAppearance } from './textRenderer.ts'

// Radius/height cross-section: recessed foot, body, shoulder, neck, rolled lip.
export const canProfile = [
  [0.195, -0.385], [0.22, -0.40], [0.235, -0.395],
  [0.25, -0.355], [0.25, 0.30], [0.245, 0.325],
  [0.22, 0.365], [0.22, 0.385], [0.23, 0.39],
  [0.23, 0.405], [0.215, 0.405], [0.215, 0.392],
] as const

export function createCanRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true })
  if (!gl) throw new Error('WebGL unavailable')
  const shaders: WebGLShader[] = []
  const program = gl.createProgram()!
  const buffers: WebGLBuffer[] = []
  const textures: WebGLTexture[] = []
  function shader(type: number, source: string) {
    const result = gl!.createShader(type)!
    shaders.push(result)
    gl!.shaderSource(result, source)
    gl!.compileShader(result)
    if (!gl!.getShaderParameter(result, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(result) || 'Shader compilation failed')
    gl!.attachShader(program, result)
  }
  shader(gl.VERTEX_SHADER, `
    attribute vec3 a_position;
    attribute vec2 a_uv;
    uniform float u_angle;
    uniform float u_tilt;
    uniform float u_roll;
    uniform float u_aspect;
    varying vec2 v_uv;
    void main() {
      vec3 p = a_position;
      float c = cos(u_angle), s = sin(u_angle);
      p = vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z);
      float tilt = u_tilt;
      p = vec3(p.x, cos(tilt)*p.y-sin(tilt)*p.z, sin(tilt)*p.y+cos(tilt)*p.z);
      float roll = u_roll;
      p.xy = mat2(cos(roll), sin(roll), -sin(roll), cos(roll))*p.xy;
      float w = 1.0-p.z/2.2;
      gl_Position = vec4(p.x*2.6, p.y*2.6*u_aspect, -p.z, w);
      v_uv = a_uv;
    }
  `)
  shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    void main() { gl_FragColor = texture2D(u_texture, v_uv); }
  `)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Can shader linking failed')
  gl.useProgram(program)
  gl.enable(gl.DEPTH_TEST)
  const position = gl.getAttribLocation(program, 'a_position')
  const uv = gl.getAttribLocation(program, 'a_uv')
  const angle = gl.getUniformLocation(program, 'u_angle')
  const tilt = gl.getUniformLocation(program, 'u_tilt')
  const roll = gl.getUniformLocation(program, 'u_roll')
  const aspect = gl.getUniformLocation(program, 'u_aspect')
  const segments = 128
  const side: number[] = []
  const caps: number[] = []
  const vertex = (radius: number, y: number, t: number, cap = false) => {
    const x = Math.sin(t * Math.PI * 2) * radius
    const z = Math.cos(t * Math.PI * 2) * radius
    return [x, y, z, cap ? 0.5 + x / 0.46 : t, cap ? 0.5 + z / 0.46 : (0.405 - y) / 0.805]
  }
  for (let ring = 0; ring < canProfile.length - 1; ring++) {
    const [r0, y0] = canProfile[ring]!
    const [r1, y1] = canProfile[ring + 1]!
    for (let i = 0; i < segments; i++) {
      const a = vertex(r0, y0, i / segments), b = vertex(r0, y0, (i + 1) / segments)
      const c = vertex(r1, y1, i / segments), d = vertex(r1, y1, (i + 1) / segments)
      side.push(...a, ...b, ...c, ...b, ...d, ...c)
    }
  }
  for (const [r, y] of [canProfile[0]!, canProfile[canProfile.length - 1]!]) {
    for (let i = 0; i < segments; i++) caps.push(0, y, 0, 0.5, 0.5, ...vertex(r, y, i / segments, true), ...vertex(r, y, (i + 1) / segments, true))
  }
  const meshes = [side, caps].map(data => {
    const buffer = gl.createBuffer()!
    buffers.push(buffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
    const texture = gl.createTexture()!
    textures.push(texture)
    return { buffer, texture, count: data.length / 5 }
  })
  function upload(index: number, source: HTMLCanvasElement) {
    gl.bindTexture(gl.TEXTURE_2D, textures[index]!)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }
  return {
    update(appearance: TextAppearance, label: string) {
      const source = document.createElement('canvas')
      source.width = 2048
      source.height = 1024
      const ctx = source.getContext('2d')!
      ctx.fillStyle = '#daf759'
      ctx.fillRect(0, 0, source.width, source.height)
      ctx.fillStyle = '#242522'
      ctx.textAlign = 'center'
      for (let copy = -1; copy <= 3; copy++) {
        const x = copy * 2048 / 3
        for (const [text, size, y] of [
          ['TYPE BREW', 32, 210], ['AB', 90, 340], ['TERMINAL', 78, 435],
          ['Aa', 260, 735], [label.toUpperCase(), 32, 815], ['330 ML · FRESHLY SET', 25, 870],
        ] as const) {
          configureTextFont(ctx, appearance, size)
          ctx.fillText(text, x, y)
        }
      }
      upload(0, source)
      source.width = source.height = 512
      ctx.fillStyle = '#daf759'
      ctx.fillRect(0, 0, 512, 512)
      upload(1, source)
    },
    draw(rotation: number, axisTilt = 0.28, axisRoll = 0.16) {
      const ratio = Math.min(window.devicePixelRatio || 1, renderBudget.pixelRatio)
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      gl.viewport(0, 0, width, height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.uniform1f(angle, rotation)
      gl.uniform1f(tilt, axisTilt)
      gl.uniform1f(roll, axisRoll)
      gl.uniform1f(aspect, width / height)
      for (const mesh of meshes) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer)
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0)
        gl.enableVertexAttribArray(uv)
        gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12)
        gl.bindTexture(gl.TEXTURE_2D, mesh.texture)
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count)
      }
    },
    dispose() {
      buffers.forEach(buffer => gl.deleteBuffer(buffer))
      textures.forEach(texture => gl.deleteTexture(texture))
      shaders.forEach(shader => gl.deleteShader(shader))
      gl.deleteProgram(program)
    },
  }
}
