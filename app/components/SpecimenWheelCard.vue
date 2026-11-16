<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { createMetallicLettersRenderer } from '~/utils/metallicLettersRenderer'

const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const ready = ref(false)
let renderer: ReturnType<typeof createMetallicLettersRenderer> | undefined
let observer: IntersectionObserver | undefined
let resize: ResizeObserver | undefined
let motion: MediaQueryList | undefined
let visible = false
let disposed = false
let frame = 0
let previous = 0
let time = 0
const gate = createFrameGate(renderBudget.fps)

function draw() { renderer?.draw(time) }
function stop() {
  cancelAnimationFrame(frame)
  frame = 0
  previous = 0
  gate.reset()
}
function tick(now: number) {
  time += previous ? Math.min((now - previous) / 1000, .05) : 0
  previous = now
  if (gate.shouldDraw(now)) draw()
  frame = requestAnimationFrame(tick)
}
function syncPlayback() {
  stop()
  if (!renderer || !visible || document.hidden) return
  draw()
  if (!motion?.matches) frame = requestAnimationFrame(tick)
}
function initialize() {
  if (disposed || renderer || !canvas.value) return
  try {
    renderer = createMetallicLettersRenderer(canvas.value)
    renderer.updateFont(activeFont.value.id)
    ready.value = true
    syncPlayback()
  } catch (error) {
    console.warn('Metallic letter preview unavailable:', error)
    renderer?.dispose()
    renderer = undefined
    ready.value = false
  }
}
function contextLost(event: Event) {
  event.preventDefault()
  stop()
  renderer?.dispose()
  renderer = undefined
  ready.value = false
}
watch(activeFont, font => {
  if (!renderer) return
  renderer.updateFont(font.id)
  syncPlayback()
})
onMounted(() => {
  motion = matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncPlayback)
  document.addEventListener('visibilitychange', syncPlayback)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    if (visible && !renderer) initialize()
    syncPlayback()
  }, { rootMargin: '120px' })
  if (host.value) observer.observe(host.value)
  resize = new ResizeObserver(syncPlayback)
  if (canvas.value) {
    resize.observe(canvas.value)
    canvas.value.addEventListener('webglcontextlost', contextLost)
    canvas.value.addEventListener('webglcontextrestored', initialize)
  }
})
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
    <div class="wheel-pin__art" role="img" :aria-label="`Rotating metallic lowercase ab letters in ${activeFont.label}`">
      <span v-if="!ready" class="wheel-pin__fallback">ab</span>
      <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': ready }" />
    </div>
    <figcaption>Chrome letters</figcaption>
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
    background: linear-gradient(180deg, #030607 10%, #23314b 65%, #505d76 100%);
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
    font-family: var(--specimen-family, var(--font-sans)); font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    font-size: 40cqw;
  }
  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}
</style>
