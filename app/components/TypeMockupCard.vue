<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { motionSystem, typographySystem, stepProgress } from '~/utils/textRenderer'
import { createCanRenderer } from '~/utils/canRenderer'
import { createCoffeeRenderer, coffeePalette } from '~/utils/coffeeRenderer'
import { createTruckRenderer, truckPalette } from '~/utils/truckRenderer'

const props = withDefaults(defineProps<{ kind?: 'can' | 'coffee' | 'truck'; aspectRatio?: string }>(), { kind: 'can' })
const mockupAspects = { can: '4 / 5', coffee: '4 / 5', truck: '1' }
const mockupStyle = computed(() => ({
  '--mockup-aspect': props.aspectRatio ?? mockupAspects[props.kind],
  ...(props.kind === 'truck'
  ? { '--mockup-bg': truckPalette.background, '--mockup-ink': truckPalette.body }
  : props.kind === 'coffee' ? { '--mockup-bg': coffeePalette.background, '--mockup-ink': coffeePalette.pack } : {}),
}))

const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const ready = ref(false)
let renderer: ReturnType<typeof createCanRenderer> | undefined
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
  if (props.kind === 'truck') {
    const rotation = .24 + stepProgress(time / 2, motionSystem.enter * 2) * Math.PI
    renderer?.draw(rotation, motionSystem.tilt * 2, 0)
    return
  }
  if (props.kind === 'coffee') {
    // Hold on printed faces; the blank gussets pass through mid-turn.
    // Half-speed clock: 4 entrance units per half-turn, 2 hold units.
    const rotation = -stepProgress(time / 2, motionSystem.enter * 2) * Math.PI
    const tilt = motionSystem.tilt * (1 + Math.sin(rotation))
    const roll = -motionSystem.tilt + Math.cos(rotation) * motionSystem.tilt / 2
    renderer?.draw(rotation, tilt, roll)
    return
  }
  const rotation = stepProgress(time, motionSystem.enter * 4) * Math.PI * 2 / 3
  // Pitch and roll follow the spin's eased progress, including its holds.
  const tilt = 0.28 + Math.sin(rotation) * 0.42
  const roll = 0.16 + Math.sin(rotation + Math.PI / 2) * 0.24
  renderer?.draw(rotation, tilt, roll)
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
  renderer.update({
    text: 'AB TERMINAL Aa', fontFamily: typographySystem.fontFamily,
    fontWeight: font.weight, fontStyle: font.style,
    letterSpacing: typographySystem.letterSpacing, color: '#242522',
  }, font.label)
  ready.value = true
  syncPlayback()
}
function initialize() {
  if (!canvas.value || disposed) return
  try {
    renderer = props.kind === 'truck' ? createTruckRenderer(canvas.value)
      : props.kind === 'coffee' ? createCoffeeRenderer(canvas.value) : createCanRenderer(canvas.value)
    void loadFont()
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
  <figure ref="host" class="mockup-pin" :style="mockupStyle">
    <div class="mockup-pin__art" role="img" :aria-label="`Rotating AB Terminal ${kind === 'truck' ? 'delivery truck' : kind === 'coffee' ? 'coffee pack' : 'beer can'}, ${activeFont.label}`">
      <span v-if="!ready" class="mockup-pin__fallback">AB<br>TERMINAL<br>Aa</span>
      <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': ready }" />
    </div>
    <figcaption>{{ kind === 'truck' ? 'Type delivery' : kind === 'coffee' ? 'Type roast' : 'Type brew' }}</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.mockup-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;
  &__art {
    position: relative;
    container-type: inline-size;
    aspect-ratio: var(--mockup-aspect);
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: var(--mockup-bg, #5634a1);
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
    color: var(--mockup-ink, #daf759);
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
