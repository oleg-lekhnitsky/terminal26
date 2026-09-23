<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { motionSystem } from '~/utils/textRenderer'
import { pharmacyFrame, type LedText } from '~/utils/pharmacyPatterns'

const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const { activeFont } = useFontSelection()
const ramp = 'PHARMACY 24H'
const size = 45
const textCache = new Map<string, LedText>()
let background: HTMLCanvasElement | undefined
let ledSprite: HTMLCanvasElement | undefined
const leds = Array.from({ length: size * size }, (_, index) => ({
  index, x: (index % size - 22) * 10, y: (Math.floor(index / size) - 22) * 10,
})).filter(({ x, y }) => Math.abs(x) <= 70 || Math.abs(y) <= 70)
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let reduced: MediaQueryList | undefined
const frameGate = createFrameGate(renderBudget.matrixFps)
let frame = 0
let visible = false
let elapsed = 0
let previous = 0

function makeLettering() { textCache.clear() }
function rasterText(label: string): LedText {
  const cached = textCache.get(label)
  if (cached) return cached
  const source = document.createElement('canvas')
  const context = source.getContext('2d', { willReadFrequently: true })!
  const font = `${activeFont.value.style} ${activeFont.value.weight} 10px "AB Terminal"`
  context.font = font
  source.width = Math.max(1, Math.ceil(context.measureText(label).width) + 4)
  source.height = 24
  context.font = font
  context.fillStyle = '#fff'
  context.textBaseline = 'middle'
  context.fillText(label, 2, 12)
  const pixels = context.getImageData(0, 0, source.width, source.height).data
  // Center the rows that actually light LEDs, rather than the font line box.
  // Use the same alpha threshold as pharmacyFrame; crop only once per label.
  let top = source.height, bottom = -1
  for (let row = 0; row < source.height; row++) {
    for (let col = 0; col < source.width; col++) {
      if (pixels[(row * source.width + col) * 4 + 3]! >= 100) {
        top = Math.min(top, row)
        bottom = Math.max(bottom, row)
      }
    }
  }
  const height = bottom >= top ? bottom - top + 1 : 1
  const image = { width: source.width, height, pixels: bottom >= top
    ? pixels.slice(top * source.width * 4, (bottom + 1) * source.width * 4)
    : new Uint8ClampedArray(source.width * 4) }
  if (textCache.size >= 64) textCache.delete(textCache.keys().next().value!)
  textCache.set(label, image)
  return image
}
function cross(context: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
  context.beginPath()
  const points = [[-76,-226],[76,-226],[76,-76],[226,-76],[226,76],[76,76],[76,226],[-76,226],[-76,76],[-226,76],[-226,-76],[-76,-76]]
  points.forEach(([x,y], index) => index ? context.lineTo(x! + offsetX, y! + offsetY) : context.moveTo(x! + offsetX, y! + offsetY))
  context.closePath()
}
// Build the static face once per resize, and the glow once per component.
// Reusing a small sprite avoids a separate blur filter operation for every LED.
function prepareSurface() {
  if (!canvas.value) return
  background = document.createElement('canvas')
  background.width = canvas.value.width
  background.height = canvas.value.height
  const context = background.getContext('2d')!
  context.setTransform(background.width / 600, 0, 0, background.height / 600, 0, 0)
  context.translate(300, 300)
  context.fillStyle = '#142218'
  context.fillRect(-320, -41, 118, 20)
  context.fillRect(-320, 30, 118, 20)
  cross(context, 0, 0)
  context.fillStyle = '#000000'; context.fill()
  context.strokeStyle = '#173d20'; context.lineWidth = 3; context.stroke()
  context.fillStyle = '#07170a'
  context.beginPath()
  for (const { x, y } of leds) context.roundRect(x - 3, y - 3, 6, 6, 1.5)
  context.fill()
  if (!ledSprite) {
    ledSprite = document.createElement('canvas')
    ledSprite.width = ledSprite.height = 48
    const led = ledSprite.getContext('2d')!
    led.scale(2, 2)
    led.fillStyle = '#00ff32'
    led.filter = 'blur(6px)'
    led.globalAlpha = .3
    led.fillRect(8, 8, 8, 8)
    led.filter = 'none'
    led.globalAlpha = 1
    led.beginPath(); led.roundRect(9, 9, 6, 6, 1.5); led.fill()
  }
}
function draw() {
  const context = canvas.value?.getContext('2d')
  if (!context || !canvas.value) return
  if (!background || !ledSprite) prepareSurface()
  if (!background || !ledSprite) return
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.value.width, canvas.value.height)
  context.drawImage(background, 0, 0)
  context.save()
  context.setTransform(canvas.value.width / 600, 0, 0, canvas.value.height / 600, 300 * canvas.value.width / 600, 300 * canvas.value.height / 600)
  const matrix = pharmacyFrame(reduced?.matches ? .2 : elapsed, motionSystem.enter * .625, rasterText)
  for (const { index, x, y } of leds) {
    const light = matrix[index]!
    if (light < .02) continue
    context.globalAlpha = light
    context.drawImage(ledSprite, x - 12, y - 12, 24, 24)
  }
  context.restore()
}
function tick(now: number) {
  if (previous) elapsed += Math.min((now - previous) / 1000, .1)
  previous = now
  if (frameGate.shouldDraw(now)) draw()
  frame = requestAnimationFrame(tick)
}
function sync() {
  cancelAnimationFrame(frame)
  previous = 0
  frameGate.reset()
  if (!visible || document.hidden) return
  draw()
  if (!reduced?.matches) frame = requestAnimationFrame(tick)
}
watch(activeFont, async (font, _, onCleanup) => {
  if (!import.meta.client) return
  let cancelled = false
  onCleanup(() => { cancelled = true })
  await document.fonts.load(`${font.style} ${font.weight} 12px "AB Terminal"`, ramp)
  if (!cancelled) { makeLettering(); draw() }
}, { immediate: true })
onMounted(() => {
  makeLettering()
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
  resizeObserver = new ResizeObserver(() => {
    if (!canvas.value) return
    const size = Math.round(canvas.value.clientWidth * Math.min(devicePixelRatio || 1, renderBudget.pixelRatio))
    canvas.value.width = size
    canvas.value.height = size
    prepareSurface()
    draw()
  })
  if (canvas.value) resizeObserver.observe(canvas.value)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  reduced?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="pharmacy-pin">
    <div class="pharmacy-pin__art">
      <canvas ref="canvas" role="img" aria-label="Monochrome green LED pharmacy cross with 288 generated programs: cross transformations, scrolling PHARMACY and 24H lettering, ECG traces, and glitches">Animated LED pharmacy cross.</canvas>
    </div>
    <figcaption>Type pharmacy</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.pharmacy-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { aspect-ratio: 1; overflow: hidden; border-radius: var(--radius-xl); background: linear-gradient(180deg, #030607 18%, #23314b 65%, #7c8390 100%); }
  canvas { display: block; width: 100%; height: 100%; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
</style>
