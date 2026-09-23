<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { typographySystem } from '~/utils/textRenderer'
import type { createCarousel3dRenderer } from '~/utils/carousel3dRenderer'

const props = defineProps<{ text: string; color: string; background: string }>()
const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const ready = ref(false)
let renderer: ReturnType<typeof createCarousel3dRenderer> | undefined
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
    text: props.text, fontFamily: typographySystem.fontFamily,
    fontWeight: font.weight, fontStyle: font.style,
    letterSpacing: typographySystem.letterSpacing, color: props.color,
  }, props.background)
  ready.value = true
  syncPlayback()
}
async function initialize() {
  if (!canvas.value || disposed) return
  try {
    const { createCarousel3dRenderer } = await import('~/utils/carousel3dRenderer')
    if (disposed || !canvas.value) return
    renderer = createCarousel3dRenderer(canvas.value)
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
watch([activeFont, () => props.text, () => props.color, () => props.background], loadFont)
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
  <div ref="host" class="carousel-3d" role="img" :aria-label="`${text}: rotating uppercase letters, ${activeFont.label}`">
    <span v-if="!ready" class="carousel-3d__fallback">{{ text.toUpperCase() }}</span>
    <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': ready }" />
  </div>
</template>

<style scoped lang="scss">
.carousel-3d {
  width: 100%; height: 100%; position: relative;
  canvas { display: block; width: 100%; height: 100%; opacity: 0; }
  canvas.is-ready { opacity: 1; }
  &__fallback { position: absolute; inset: 0; display: grid; place-content: center; font-size: 12cqw; }
}
</style>
