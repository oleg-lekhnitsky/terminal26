<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { typographySystem } from '~/utils/textRenderer'
import type { createWheelRenderer } from '~/utils/wheelRenderer'

const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const ready = ref(false)
let renderer: ReturnType<typeof createWheelRenderer> | undefined
let observer: IntersectionObserver | undefined
let resize: ResizeObserver | undefined
let motion: MediaQueryList | undefined
let visible = false
const frameGate = createFrameGate(renderBudget.fps)
let frame = 0
let previous = 0
let time = 0
let disposed = false
let fontRequest = 0

function draw() {
  renderer?.draw(time)
}
function stop() {
  cancelAnimationFrame(frame)
  frame = 0
  previous = 0
  frameGate.reset()
}
function tick(now: number) {
  time += previous ? Math.min((now - previous) / 1000, 0.05) : 0
  previous = now
  if (frameGate.shouldDraw(now)) draw()
  frame = requestAnimationFrame(tick)
}
function syncPlayback() {
  stop()
  draw()
  if (renderer && visible && !document.hidden && !motion?.matches) frame = requestAnimationFrame(tick)
}
async function loadFont() {
  const request = ++fontRequest
  const font = activeFont.value
  try {
    await document.fonts.load(`${font.style} ${font.weight} 100px ${typographySystem.fontFamily}`, 'AB TERMINAL Aa')
  } catch { /* Keep the available fallback font. */ }
  if (disposed || request !== fontRequest || !renderer) return
  renderer.updateFont({
    text: 'AB TERMINAL Aa', fontFamily: typographySystem.fontFamily,
    fontWeight: font.weight, fontStyle: font.style,
    letterSpacing: typographySystem.letterSpacing, color: '#242522',
  })
  ready.value = true
  syncPlayback()
}
async function initialize() {
  if (!canvas.value || disposed) return
  try {
    const { createWheelRenderer } = await import('~/utils/wheelRenderer')
    if (disposed || !canvas.value) return
    renderer = createWheelRenderer(canvas.value)
    await loadFont()
  } catch {
    renderer?.dispose()
    renderer = undefined
    ready.value = false
  }
}
function contextLost(event: Event) {
  event.preventDefault()
  stop()
  renderer = undefined
  ready.value = false
}
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncPlayback)
  document.addEventListener('visibilitychange', syncPlayback)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    syncPlayback()
  })
  if (host.value) observer.observe(host.value)
  resize = new ResizeObserver(draw)
  if (canvas.value) {
    resize.observe(canvas.value)
    canvas.value.addEventListener('webglcontextlost', contextLost)
    canvas.value.addEventListener('webglcontextrestored', initialize)
  }
  initialize()
})
watch(activeFont, loadFont)
onBeforeUnmount(() => {
  disposed = true
  stop()
  observer?.disconnect()
  resize?.disconnect()
  motion?.removeEventListener('change', syncPlayback)
  document.removeEventListener('visibilitychange', syncPlayback)
  canvas.value?.removeEventListener('webglcontextlost', contextLost)
  canvas.value?.removeEventListener('webglcontextrestored', initialize)
  renderer?.dispose()
})
</script>

<template>
  <figure ref="host" class="wheel-pin">
    <div class="wheel-pin__art" role="img" :aria-label="`Carousel 3D 07: rotating AB Terminal posters, ${activeFont.label}`">
      <span v-if="!ready" class="wheel-pin__fallback">AB<br>TERMINAL<br>Aa</span>
      <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': ready }" />
    </div>
    <figcaption>Specimen wheel</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.wheel-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;
  &__art {
    position: relative;
    container-type: inline-size;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, #030607 18%, #23314b 65%, #7c8390 100%);
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    &.is-ready { opacity: 1; }
  }
  &__fallback {
    position: absolute;
    inset: 15%;
    display: grid;
    place-content: center;
    text-align: center;
    color: #f3eedf;
    font-family: var(--font-sans);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    font-size: 10cqw;
  }
  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}
</style>
