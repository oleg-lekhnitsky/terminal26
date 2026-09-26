import { oneShotText } from './fontSymbols.ts'

export interface TextAppearance {
  text: string
  wholeText?: boolean
  preserveCase?: boolean
  staggerByWords?: boolean
  lineHeight?: number
  fontFamily: string
  fontWeight: number
  fontStyle?: 'normal' | 'italic'
  letterSpacing?: number
  color: string
  preset?: TextPreset
}

// Seconds and em-relative distances shared by every specimen.
export const motionSystem = Object.freeze({
  enter: 0.8,
  hold: 0.8,
  exit: 0.4,
  rest: 0.16,
  stagger: 0.08,
  travel: 0.65,
  tilt: 0.12,
})

// Quicker word changes retain the same fully visible reading time.
const wordTiming = { hold: motionSystem.hold, exit: 0.2, rest: 0.04 }

export const typographySystem = Object.freeze({
  fontFamily: '"AB Terminal", sans-serif',
  fontWeight: 700,
  letterSpacing: -.02,
})

export function configureTextFont(context: CanvasRenderingContext2D, appearance: TextAppearance, size: number) {
  context.font = `${appearance.fontStyle ?? 'normal'} ${appearance.fontWeight} ${size}px ${appearance.fontFamily}`
  context.fontKerning = 'normal'
  const tracking = Number.isFinite(appearance.letterSpacing) ? appearance.letterSpacing! : typographySystem.letterSpacing
  context.letterSpacing = `${tracking * size}px`
}

// Ratios of the base tokens: deliberate variation within one timing scale.
export const motionProfiles = {
  rise: { duration: 1, stagger: 1 },
  letter: { duration: 0.5, stagger: 1 },
  carousel: { duration: 2, stagger: 0 },
  drop: { duration: 0.5, stagger: 2 },
  typewriter: { duration: 0.5, stagger: 0.5 },
  slide: { duration: 4, stagger: 1 },
  fan: { duration: 2, stagger: 1 },
  words: { duration: 0.5, stagger: 1 },
  numbers: { duration: 0.5, stagger: 1 },
  poster: { duration: 1, stagger: 2 },
  collage: { duration: 2, stagger: 1 },
} as const

export const textPresets = ([
  { id: 'rise', name: 'Rise', text: 'Hello{', background: '#ede9e1', color: '#24221f', aspectRatio: '22 / 12' },
  { id: 'letter', name: 'One at a time', text: oneShotText('bold'), background: '#ffbd13', color: '#263219', aspectRatio: '22 / 28' },
  { id: 'carousel', name: 'Flip flop', text: '"|', background: '#026b2c', color: '#f652e3', aspectRatio: '22 / 23' },
  { id: 'drop', name: 'Drop', text: 'Латиница', background: '#f1f1e9', color: '#421f18', aspectRatio: '22 / 8' },
  { id: 'typewriter', name: 'Typewriter', text: '$20', background: '#252e48', color: '#f0e9d9', aspectRatio: '22 / 24' },
  { id: 'slide', name: 'On repeat', text: 'I opened this file to fix one tiny thing. Three hours later, the letters have a new font, the cube has opinions, and I have forgotten what the tiny thing was. Anyway, look at that spacing.', background: '#b7d3cb', color: '#173d35', aspectRatio: '22 / 16' },
  { id: 'fan', name: 'Fan', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', background: '#f0bed0', color: '#642a46', aspectRatio: '22 / 28' },
  { id: 'words', name: 'Word by word', text: 'Regular Bold Italic Болд Италик Регулар', background: '#b8cfee', color: '#252e48', aspectRatio: '22 / 24' },
  { id: 'numbers', name: 'Numbers', text: '0 1 2 3 4 5 6 7 8 9', background: '#db3b32', color: '#fff0d9', aspectRatio: '4 / 5' },
  { id: 'poster', name: 'Poster', text: 'What\nThe\nfont', background: '#2447cf', color: '#f1f0df', aspectRatio: '3 / 4' },
  { id: 'collage', name: 'Type collage', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', background: '#deded7', color: '#101611', aspectRatio: '2 / 3' },
] as const).map((preset, index) => ({
  ...preset,
  letterSpacing: typographySystem.letterSpacing,
  duration: motionSystem.enter * motionProfiles[preset.id].duration,
  stagger: motionSystem.stagger * motionProfiles[preset.id].stagger,
  delay: preset.id === 'letter' ? 0 : (index % 4) * motionSystem.stagger * 2,
}))

export type TextPreset = typeof textPresets[number]['id']
export const isContinuousPreset = (preset: TextPreset) => ['letter', 'carousel', 'slide', 'fan', 'words', 'numbers', 'collage'].includes(preset)

const collageColors = ['#101611', '#087abb', '#101611', '#5634a1', '#daf759', '#101611', '#06774f', '#db181e']
// Clipped edge layers, crossing middle layers, then three readable paper fronts.
export const collageTiles = [
  [0.04, 0.02, -0.62], [0.49, 0.02, 1.48], [0.98, 0.09, 0.68],
  [-0.02, 0.36, -1.2], [1.02, 0.4, 2.6],
  [-0.03, 0.73, 0.72], [1.0, 0.76, -1.05],
  [0.18, 1.02, 2.75], [0.67, 1.03, -0.72],
  [0.38, 0.22, -0.68], [0.78, 0.24, 0.42],
  [0.43, 0.5, 2.25], [0.82, 0.64, -0.42],
  [0.27, 0.79, 0.66], [0.64, 0.89, -0.68],
  [0.6, 0.1, -0.12], [0.17, 0.48, -0.48], [0.78, 0.56, 0.2],
].map(([x, y, rotation], index) => ({
  x: x!,
  y: y!,
  rotation: rotation!,
  color: collageColors[index % collageColors.length]!,
}))

export function collageCamera(time: number, duration: number, still = false) {
  if (still) return { x: 0, y: 0 }
  const stops = [[0, 0], [0.5, 0.125], [0.625, 0.625], [0.125, 0.5]] as const
  const move = Math.max(0.1, duration) * 4
  const elapsed = Math.max(0, time) / (move + motionSystem.hold)
  const step = Math.floor(elapsed)
  const progress = flow((elapsed - step) * (move + motionSystem.hold) / move)
  const from = stops[step % stops.length]!
  const to = stops[(step + 1) % stops.length]!
  return { x: from[0] + (to[0] - from[0]) * progress, y: from[1] + (to[1] - from[1]) * progress }
}

export function fanPose(time: number, index: number, count: number, duration: number, still = false) {
  const position = carouselPosition(still ? 0 : time, index, count, duration)
  const angle = position * 0.34
  const edge = Math.min(2.4, count / 2)
  return {
    x: Math.sin(angle) * 3.2,
    y: (1 - Math.cos(angle)) * 3.2,
    rotation: angle,
    opacity: count <= 1 ? 1 : 1 - flow((Math.abs(position) - Math.max(0, edge - 0.5)) / 0.5),
  }
}

// Shared Flow: cubic-bezier(0.86, 0.14, 0.14, 0.86)
// Invert the Bezier's x coordinate so the input represents elapsed time.
export function flow(progress: number) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  let low = 0
  let high = 1
  for (let iteration = 0; iteration < 24; iteration++) {
    const t = (low + high) / 2
    const x = 3 * 0.86 * (1 - t) ** 2 * t + 3 * 0.14 * (1 - t) * t ** 2 + t ** 3
    if (x < progress) low = t
    else high = t
  }
  const t = (low + high) / 2
  return 3 * 0.14 * (1 - t) ** 2 * t + 3 * 0.86 * (1 - t) * t ** 2 + t ** 3
}

export function measureTextLayout(units: string[], measure: (text: string) => number, independent = false) {
  let prefix = ''
  let width = 0
  const positions = units.map(unit => {
    const unitWidth = measure(unit)
    if (independent) {
      width = Math.max(width, unitWidth)
      return { x: 0, width: unitWidth }
    }
    prefix += unit
    width = measure(prefix)
    // The prefix includes kerning against the preceding letter. Measuring the
    // preceding prefix alone would omit that adjustment from this origin.
    return { x: width - unitWidth, width: unitWidth }
  })
  return { width, positions }
}

export function wrapTextLines(text: string, width: number, measure: (text: string) => number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && measure(candidate) > width) {
      lines.push(line)
      line = word
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines
}

export function centeredTextBaseline(height: number, bounds: { actualBoundingBoxAscent: number; actualBoundingBoxDescent: number }[], lineAdvance = 0) {
  if (!bounds.length) return height / 2
  const top = Math.min(...bounds.map((metric, index) => index * lineAdvance - metric.actualBoundingBoxAscent))
  const bottom = Math.max(...bounds.map((metric, index) => index * lineAdvance + metric.actualBoundingBoxDescent))
  return height / 2 - (top + bottom) / 2
}

export function sequenceFrame(time: number, end: number, loop: boolean) {
  if (!loop) return { time: Math.min(time, end), opacity: 1 }
  const cycle = end + motionSystem.hold + motionSystem.exit + motionSystem.rest
  const phase = time % cycle
  return { time: Math.min(phase, end), opacity: 1 - flow((phase - end - motionSystem.hold) / motionSystem.exit) }
}

// One Shot 01: six equally timed slots over four seconds, at 70% size.
export const oneShotSystem = Object.freeze({ duration: 4, slots: 6, scale: 0.7 })

export function oneShotIndex(time: number, count: number) {
  if (count <= 0) return 0
  return Math.floor(Math.max(0, time) * oneShotSystem.slots / oneShotSystem.duration) % count
}

export function itemFrame(time: number, duration: number, timing: { hold: number; exit: number; rest: number } = motionSystem) {
  const enterDuration = Math.max(0.1, duration)
  const cycle = enterDuration + timing.hold + timing.exit + timing.rest
  const elapsed = time / cycle
  const index = Math.floor(elapsed)
  const phase = (elapsed - index) * cycle
  const enter = flow(phase / enterDuration)
  const exit = flow((phase - enterDuration - timing.hold) / timing.exit)
  return { index, offset: (1 - enter - exit) * motionSystem.travel, opacity: enter * (1 - exit) }
}

// Traveling specimens use the same move-and-hold rhythm as entrances.
export function stepProgress(time: number, duration: number) {
  const move = Math.max(0.1, duration)
  const cycle = move + motionSystem.hold
  const elapsed = time / cycle
  const index = Math.floor(elapsed)
  return index + flow((elapsed - index) * cycle / move)
}

export function carouselPosition(time: number, index: number, count: number, duration: number) {
  if (count <= 1) return 0
  const phase = stepProgress(time, duration)
  return ((index - phase + count * 1000 + count / 2) % count + count) % count - count / 2
}

// Figma library Carousel 18, overriding alternate tilt with fan.
// Tilt is expressed in hundredths of a radian in the reference renderer.
export const carousel18 = Object.freeze({ planeSize: 657, gap: 273, tilt: -25, visibleCount: 6, cameraDistance: 8, depth: 0.48 })

export function carousel18Pose(time: number, index: number, count: number, duration: number, still = false) {
  const elapsed = Math.max(0, still ? 0 : time) / Math.max(0.1, duration)
  const phase = Math.floor(elapsed) + flow(elapsed % 1)
  const centered = count <= 1 ? 0 : ((index - phase) % count + count + count / 2) % count - count / 2
  return {
    position: -centered,
    // Canvas y points downward, reversing Three.js's Z rotation.
    rotation: -Math.max(-1, Math.min(1, centered)) * carousel18.tilt / 100,
    scale: carousel18.cameraDistance / (carousel18.cameraDistance + Math.abs(centered) * carousel18.depth),
    visible: Math.abs(centered) <= (carousel18.visibleCount - 1) / 2,
  }
}

export function posterLinePose(time: number, index: number, duration: number, stagger: number, count: number, hold = motionSystem.hold) {
  const elapsed = time - index * stagger
  const enterDuration = Math.max(0.1, duration)
  const enter = flow(elapsed / enterDuration)
  const exitStart = duration + Math.max(0, count - 1) * stagger + hold
  const exit = flow((time - exitStart - index * stagger) / motionSystem.exit)
  return { y: (1 - enter - exit) * motionSystem.travel, opacity: enter * (1 - exit) }
}

export function letterPose(time: number, index: number, duration: number, stagger: number, preset: TextPreset = 'rise', count = 1) {
  const center = index - (count - 1) / 2
  const progress = Math.max(0, Math.min(1, (time - index * stagger) / Math.max(0.1, duration)))
  const settle = 1 - flow(progress)
  const pose = { x: 0, y: 0, rotation: 0, scale: 1, opacity: flow(progress) }
  if (preset === 'drop') pose.y = -motionSystem.travel * settle
  else if (preset === 'poster') pose.y = motionSystem.travel * settle
  else if (preset === 'typewriter') {
    const interval = Math.max(motionSystem.stagger / 2, stagger)
    pose.opacity = flow((time - index * interval) / interval)
  }
  else if (preset === 'rise') {
    pose.x = center * motionSystem.tilt * settle
    pose.y = motionSystem.travel * settle
    pose.rotation = (index % 2 ? -1 : 1) * motionSystem.tilt * settle
  }
  return pose
}

const vertexSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_size;
uniform float u_rotation;
uniform float u_scale;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  vec2 local = a_position * u_size * 0.5 * u_scale;
  float c = cos(u_rotation);
  float s = sin(u_rotation);
  vec2 pixel = u_center + mat2(c, s, -s, c) * local;
  vec2 clip = pixel / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`

const fragmentSource = `
precision mediump float;
uniform sampler2D u_text;
uniform float u_opacity;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_text, v_uv) * u_opacity;
}`

// Each grapheme has its own texture and quad. Only transforms change per frame.
export function createTextRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true })
  if (!gl) throw new Error('WebGL is unavailable')

  const shaders: WebGLShader[] = []
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  const textures: WebGLTexture[] = []
  let letters: { texture: WebGLTexture; x: number; y: number; width: number; height: number; centerOffset: number }[] = []
  let fontSize = 0
  let wordWidth = 0
  const dispose = () => {
    shaders.forEach(shader => gl.deleteShader(shader))
    textures.forEach(texture => gl.deleteTexture(texture))
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }

  try {
    if (!program || !buffer) throw new Error('Unable to allocate WebGL resources')
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to create shader')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed')
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed')
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.uniform1i(gl.getUniformLocation(program, 'u_text'), 0)
    const locations = Object.fromEntries(['u_resolution', 'u_center', 'u_size', 'u_rotation', 'u_scale', 'u_opacity'].map(name => [name, gl.getUniformLocation(program, name)]))
    const source = document.createElement('canvas')
    const context = source.getContext('2d')
    if (!context) throw new Error('Canvas text is unavailable')
    const maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096)
    const uploadTexture = () => {
      const texture = gl.createTexture()
      if (!texture) throw new Error('Unable to allocate text texture')
      textures.push(texture)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      return texture
    }


    return {
      dispose,
      update(width: number, height: number, appearance: TextAppearance) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2, maxSize / Math.max(width, height, 1))
        canvas.width = Math.max(1, Math.round(width * ratio))
        canvas.height = Math.max(1, Math.round(height * ratio))
        gl.viewport(0, 0, canvas.width, canvas.height)
        textures.forEach(texture => gl.deleteTexture(texture))
        textures.length = 0
        letters = []
        if (appearance.preset === 'collage') {
          const tileWidth = canvas.width * 0.56
          const tileHeight = tileWidth * 1.18
          const gutter = Math.ceil(tileWidth * 0.035)
          const glyphs = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(appearance.text.trim()), item => item.segment).filter(glyph => glyph.trim())
          for (const [index, tile] of collageTiles.entries()) {
            source.width = Math.ceil(tileWidth + gutter * 2)
            source.height = Math.ceil(tileHeight + gutter * 2)
            context.fillStyle = '#f7f6f2'
            context.shadowColor = 'rgba(8, 16, 10, 0.32)'
            context.shadowBlur = gutter * 0.18
            context.shadowOffsetY = gutter * 0.14
            context.beginPath()
            context.roundRect(gutter, gutter, tileWidth, tileHeight, tileWidth * 0.012)
            context.fill()
            context.shadowColor = 'transparent'
            context.strokeStyle = 'rgba(20, 25, 20, 0.2)'
            context.lineWidth = Math.max(1, tileWidth * 0.003)
            context.stroke()
            const glyph = glyphs[index % Math.max(1, glyphs.length)] || 'A'
            configureTextFont(context, appearance, 100)
            const bounds = context.measureText(glyph)
            const inkWidth = Math.max(1, bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight)
            const inkHeight = Math.max(1, bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent)
            const glyphSize = Math.min(tileWidth * 0.96 / inkWidth, tileHeight * 0.8 / inkHeight) * 100
            configureTextFont(context, appearance, glyphSize)
            context.textAlign = 'left'
            const ink = context.measureText(glyph)
            context.fillStyle = tile.color
            context.fillText(glyph,
              gutter + (tileWidth - ink.actualBoundingBoxLeft - ink.actualBoundingBoxRight) / 2 + ink.actualBoundingBoxLeft,
              gutter + tileHeight * 0.035 + (tileHeight * 0.8 - ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2 + ink.actualBoundingBoxAscent)
            context.textAlign = 'center'
            configureTextFont(context, { ...appearance, letterSpacing: 0.03 }, tileWidth * 0.055)
            context.fillStyle = '#315675'
            context.fillText('AB TERMINAL', source.width / 2, gutter + tileHeight * 0.93)
            const texture = uploadTexture()
            letters.push({ texture, x: tile.x * canvas.width, y: tile.y * canvas.height, width: source.width, height: source.height, centerOffset: 0 })
          }
          return
        }
        const text = (appearance.preset === 'carousel' ? appearance.text.toUpperCase() : appearance.text).replace(/\s+/g, ' ')
        const poster = appearance.preset === 'poster'
        const paragraph = appearance.preset === 'slide'
        const multiline = poster || paragraph
        configureTextFont(context, appearance, 100)
        const graphemes = appearance.preset === 'words' && appearance.wholeText ? [text.trim()] : paragraph
          ? wrapTextLines(text, 0.78 / 0.05 * 100, value => context.measureText(value).width)
          : multiline
          ? (poster && !appearance.preserveCase ? appearance.text.toUpperCase() : appearance.text).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
          : appearance.preset === 'letter' || appearance.preset === 'words' || appearance.preset === 'numbers'
          ? text.trim().split(/\s+/).filter(Boolean)
          : Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), item => item.segment)
        configureTextFont(context, appearance, 100)
        const single = multiline || appearance.preset === 'letter' || appearance.preset === 'carousel' || appearance.preset === 'fan' || appearance.preset === 'words' || appearance.preset === 'numbers'
        const measured = measureTextLayout(graphemes, value => context.measureText(value).width, single)
        const fitWidth = Math.max(measured.width, 1)
        const widthFraction = appearance.preset === 'letter' ? oneShotSystem.scale : appearance.preset === 'numbers' ? 0.92 : poster ? 0.86 : appearance.preset === 'fan' ? 0.5 : appearance.preset === 'carousel' ? 0.42 : 0.78
        const heightFraction = appearance.preset === 'letter' ? oneShotSystem.scale : appearance.preset === 'numbers' ? 0.95 : multiline ? 0.78 / (Math.max(1, graphemes.length) * (paragraph ? 1.35 : 1)) : single ? 0.52 : 0.42
        fontSize = Math.min(canvas.width * widthFraction / fitWidth * 100, canvas.height * heightFraction)
        if (appearance.preset === 'carousel') {
          const viewportHeight = 2 * carousel18.cameraDistance * Math.tan(18 * Math.PI / 180)
          const pixelsPerUnit = canvas.height / viewportHeight
          const planeScale = carousel18.planeSize / 600
          const maxWidth = Math.min(3.4 * pixelsPerUnit, canvas.width * 0.78) * planeScale
          const maxHeight = Math.min(2.35 * pixelsPerUnit, canvas.height * 0.68) * planeScale
          const inkHeight = Math.max(1, ...graphemes.map(glyph => {
            const metrics = context.measureText(glyph)
            return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
          }))
          fontSize = Math.min(maxWidth / fitWidth, maxHeight / inkHeight) * 100
        }
        if (paragraph) fontSize = Math.min(fontSize, canvas.width * 0.05)
        // Re-measure at the actual rendering size; kerning may not scale linearly.
        configureTextFont(context, appearance, fontSize)
        const layout = measureTextLayout(graphemes, value => context.measureText(value).width, single)
        wordWidth = layout.width
        const origin = (canvas.width - wordWidth) / 2
        const bounds = graphemes.map(letter => context.measureText(letter))
        const lineAdvance = multiline ? fontSize * (poster ? (appearance.lineHeight ?? 0.85) : 1.35) : 0
        const baseline = centeredTextBaseline(canvas.height, bounds, lineAdvance)
          - (appearance.preset === 'rise' ? canvas.height * 0.04 : 0)
        const runs = graphemes.flatMap((line, index) => {
          if (!poster || !appearance.staggerByWords) return [{ letter: line, index, offset: 0 }]
          return Array.from(line.matchAll(/\S+/g), match => ({
            letter: match[0], index,
            offset: context.measureText(line.slice(0, match.index)).width,
          }))
        })
        runs.forEach(({ letter, index, offset }) => {
          configureTextFont(context, appearance, fontSize)
          const cursor = paragraph ? origin : multiline ? (canvas.width - layout.positions[index]!.width) / 2 : origin + layout.positions[index]!.x
          const metrics = context.measureText(letter)
          const lineBaseline = single && !multiline
            ? centeredTextBaseline(canvas.height, [metrics])
            : baseline + index * lineAdvance
          const padding = Math.ceil(fontSize * 0.15) + 2
          const left = Math.max(0, metrics.actualBoundingBoxLeft)
          const right = Math.max(metrics.width, metrics.actualBoundingBoxRight)
          const ascent = Math.max(0, metrics.actualBoundingBoxAscent)
          const descent = Math.max(0, metrics.actualBoundingBoxDescent)
          source.width = Math.max(1, Math.ceil(left + right + padding * 2))
          source.height = Math.max(1, Math.ceil(ascent + descent + padding * 2))
          configureTextFont(context, appearance, fontSize)
          context.fillStyle = appearance.color
          context.fillText(letter, padding + left, padding + ascent)
          const texture = uploadTexture()
          letters.push({ texture, x: cursor + offset - left - padding + source.width / 2, y: lineBaseline - ascent - padding + source.height / 2, width: source.width, height: source.height, centerOffset: -left - padding + source.width / 2 - metrics.width / 2 })
        })
      },
      duration(duration: number, stagger: number, preset: TextPreset) {
        if (preset === 'poster') return duration + Math.max(0, letters.length - 1) * stagger * 2
        if (preset === 'collage') return 4 * (Math.max(0.1, duration) * 4 + motionSystem.hold)
        if (preset === 'typewriter') return Math.max(duration, letters.length * Math.max(motionSystem.stagger / 2, stagger))
        if (preset === 'letter') return Math.max(1, letters.length) * oneShotSystem.duration / oneShotSystem.slots
        if (preset === 'words' || preset === 'numbers') {
          const timing = preset === 'words' ? wordTiming : motionSystem
          return Math.max(1, letters.length) * (duration + timing.hold + timing.exit + timing.rest)
        }
        if (preset === 'carousel') return Math.max(1, letters.length) * duration
        if (preset === 'fan') return Math.max(1, letters.length) * (duration + motionSystem.hold)
        if (preset === 'slide') return duration + motionSystem.hold
        return duration + Math.max(0, letters.length - 1) * stagger
      },
      draw(time: number, duration: number, stagger: number, preset: TextPreset, opacity = 1, still = false, hold = motionSystem.hold) {
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.uniform2f(locations.u_resolution!, canvas.width, canvas.height)
        const render = (letter: typeof letters[number], x: number, y: number, scale: number, rotation: number, alpha: number) => {
          gl.bindTexture(gl.TEXTURE_2D, letter.texture)
          gl.uniform2f(locations.u_center!, x, y)
          gl.uniform2f(locations.u_size!, letter.width, letter.height)
          gl.uniform1f(locations.u_rotation!, rotation)
          gl.uniform1f(locations.u_scale!, scale)
          gl.uniform1f(locations.u_opacity!, alpha * opacity)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
        const camera = preset === 'collage' ? collageCamera(time, duration, still) : { x: 0, y: 0 }
        letters.forEach((letter, index) => {
          if (preset === 'collage') {
            const tile = collageTiles[index]!
            // Repeat the paper field beyond the viewport, sharing GPU textures.
            // Cull using the full diagonal so tilted corners never pop into view.
            const radius = Math.hypot(letter.width, letter.height) / 2
            for (let row = -1; row <= 1; row++) {
              for (let column = -1; column <= 1; column++) {
                const x = letter.x + (column - camera.x) * canvas.width
                const y = letter.y + (row - camera.y) * canvas.height
                if (x + radius < 0 || x - radius > canvas.width || y + radius < 0 || y - radius > canvas.height) continue
                render(letter, x, y, 1, tile.rotation, 1)
              }
            }
            return
          }
          if (preset === 'fan') {
            const pose = fanPose(time, index, letters.length, duration, still)
            const offset = letter.centerOffset
            render(letter, canvas.width / 2 + fontSize * pose.x + offset * Math.cos(pose.rotation), canvas.height * 0.48 + fontSize * pose.y + offset * Math.sin(pose.rotation), 1, pose.rotation, pose.opacity)
            return
          }
          if (preset === 'letter') {
            if (index === (still ? 0 : oneShotIndex(time, letters.length))) {
              render(letter, canvas.width / 2 + letter.centerOffset, letter.y, 1, 0, 1)
            }
            return
          }
          if (preset === 'words' || preset === 'numbers') {
            const frame = itemFrame(time, duration, preset === 'words' ? wordTiming : motionSystem)
            const active = frame.index % Math.max(1, letters.length)
            if (index !== (still ? 0 : active)) return
            const travel = preset === 'words' ? 0.5 : 1
            render(letter, canvas.width / 2 + letter.centerOffset, letter.y + (still ? 0 : frame.offset * fontSize * travel), 1, 0, still ? 1 : frame.opacity)
            return
          }
          if (preset === 'carousel') {
            const pose = carousel18Pose(time, index, letters.length, duration, still)
            if (!pose.visible) return
            const pixelsPerUnit = canvas.height / (2 * carousel18.cameraDistance * Math.tan(18 * Math.PI / 180))
            const sceneUnit = Math.min(3.4 * pixelsPerUnit, canvas.width * 0.78, 2.35 * pixelsPerUnit, canvas.height * 0.68) / 600
            const pitch = wordWidth + carousel18.gap * sceneUnit
            const localX = letter.centerOffset
            const localY = letter.y - canvas.height / 2
            const c = Math.cos(pose.rotation), s = Math.sin(pose.rotation)
            render(letter,
              canvas.width / 2 + (pose.position * pitch + localX * c - localY * s) * pose.scale,
              canvas.height / 2 + (localX * s + localY * c) * pose.scale,
              pose.scale, pose.rotation, 1)
            return
          }
          if (preset === 'slide') {
            const pitch = wordWidth + fontSize * 0.8
            const offset = still ? 0 : (stepProgress(time, duration) % 1) * pitch
            const copies = Math.ceil(canvas.width / Math.max(pitch, 1)) + 1
            for (let copy = -1; copy <= copies; copy++) render(letter, letter.x - offset + copy * pitch, letter.y, 1, 0, 1)
            return
          }
          if (preset === 'poster') {
            const pose = still ? { y: 0, opacity: 1 } : posterLinePose(time, index, duration, stagger, letters.length, hold)
            render(letter, letter.x, letter.y + fontSize * pose.y, 1, 0, pose.opacity)
            return
          }
          const pose = letterPose(time, index, duration, stagger, preset, letters.length)
          render(letter, letter.x + fontSize * pose.x, letter.y + fontSize * pose.y, pose.scale, pose.rotation, pose.opacity)
        })
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}
