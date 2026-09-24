<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { createTextRenderer, motionSystem, typographySystem, isContinuousPreset, sequenceFrame, type TextPreset } from '~/utils/textRenderer'

const props = withDefaults(defineProps<{
  text: string
  wholeText?: boolean
  preset?: TextPreset
  replayKey?: number
  loop?: boolean
  fontFamily?: string
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  letterSpacing?: number
  color?: string
  duration?: number
  stagger?: number
  delay?: number
  speed?: number
  paused?: boolean
}>(), {
  preset: 'rise',
  replayKey: 0,
  fontFamily: typographySystem.fontFamily,
  fontWeight: typographySystem.fontWeight,
  fontStyle: 'normal',
  letterSpacing: typographySystem.letterSpacing,
  color: '#d6d6d6',
  duration: motionSystem.enter,
  stagger: motionSystem.stagger,
  delay: 0,
  speed: 1,
})

const host = useTemplateRef('host')
const emit = defineEmits<{ cycleComplete: [] }>()
const canvas = useTemplateRef('canvas')
const ready = ref(false)
let renderer: ReturnType<typeof createTextRenderer> | undefined
let resizeObserver: ResizeObserver | undefined
let intersectionObserver: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
const frameGate = createFrameGate(renderBudget.fps)
let frame = 0
let time = 0
let delayRemaining = 0
let previous = 0
let visible = false
let disposed = false
let fontRequest = 0
const clamp = (value: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0
const duration = computed(() => Math.max(0.1, clamp(props.duration, 5)))
const stagger = computed(() => clamp(props.stagger, 0.5))
const endTime = () => renderer?.duration(duration.value, stagger.value, props.preset) ?? 0

function draw() {
  const still = motion?.matches ?? false
  const frame = props.preset === 'poster'
    ? { time: props.loop ? time % (endTime() + motionSystem.hold + motionSystem.exit + motionSystem.rest) : Math.min(time, (endTime() + duration.value) / 2), opacity: 1 }
    : isContinuousPreset(props.preset)
    ? { time, opacity: 1 }
    : sequenceFrame(time, endTime(), props.loop)
  renderer?.draw(still ? endTime() : frame.time, duration.value, stagger.value, props.preset, still ? 1 : frame.opacity, still)
}

function replay() {
  time = 0
  delayRemaining = clamp(props.delay, 5)
  syncPlayback()
}

defineExpose({ replay })

function stop() {
  cancelAnimationFrame(frame)
  frame = 0
  previous = 0
  frameGate.reset()
}

function tick(now: number) {
  const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0
  previous = now
  const elapsed = delta * clamp(props.speed, 4)
  const waiting = Math.min(delayRemaining, elapsed)
  delayRemaining -= waiting
  const previousTime = time
  time += elapsed - waiting
  if (props.loop && !isContinuousPreset(props.preset)) {
    const cycle = endTime() + motionSystem.hold + motionSystem.exit + motionSystem.rest
    if (Math.floor(time / cycle) > Math.floor(previousTime / cycle)) emit('cycleComplete')
  }
  if (props.loop && props.preset === 'words' && props.wholeText) {
    const cycle = endTime()
    if (cycle > 0 && Math.floor(time / cycle) > Math.floor(previousTime / cycle)) emit('cycleComplete')
  }
  if (frameGate.shouldDraw(now) || (!props.loop && time >= endTime())) draw()
  if (props.loop || time < endTime()) frame = requestAnimationFrame(tick)
  else stop()
}

function syncPlayback() {
  stop()
  if (!renderer || disposed) return
  draw()
  if (!props.paused && !motion?.matches && visible && !document.hidden && (props.loop || time < endTime()) && props.speed > 0) frame = requestAnimationFrame(tick)
}

function updateTexture() {
  if (!renderer || !host.value) return
  const { width, height } = host.value.getBoundingClientRect()
  if (!width || !height) return
  try {
    renderer.update(width, height, props)
    draw()
    ready.value = true
  } catch {
    stop()
    renderer.dispose()
    renderer = undefined
    ready.value = false
  }
}

async function loadFont() {
  const request = ++fontRequest
  updateTexture()
  try {
    await document.fonts.load(`${props.fontStyle} ${props.fontWeight} 100px ${props.fontFamily}`, props.text)
  } catch {
    // Invalid or unavailable fonts retain the browser's fallback.
  }
  if (!disposed && request === fontRequest) {
    updateTexture()
    replay()
  }
}

function initialize() {
  if (!canvas.value || disposed) return
  try {
    renderer = createTextRenderer(canvas.value)
    void loadFont()
    syncPlayback()
  } catch {
    renderer?.dispose()
    renderer = undefined
    ready.value = false
  }
}

function onContextLost(event: Event) {
  event.preventDefault()
  stop()
  renderer = undefined
  ready.value = false
}

onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncPlayback)
  document.addEventListener('visibilitychange', syncPlayback)
  document.fonts.addEventListener('loadingdone', updateTexture)
  canvas.value?.addEventListener('webglcontextlost', onContextLost)
  canvas.value?.addEventListener('webglcontextrestored', initialize)
  resizeObserver = new ResizeObserver(updateTexture)
  resizeObserver.observe(host.value!)
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    syncPlayback()
  })
  intersectionObserver.observe(host.value!)
  initialize()
})

watch(() => [props.text, props.wholeText, props.fontFamily, props.fontWeight, props.fontStyle, props.letterSpacing, props.color, props.preset], () => {
  if (renderer) {
    void loadFont()
    replay()
  }
})
watch(() => [props.replayKey, props.delay], replay)
watch(() => [props.paused, props.speed, props.duration, props.stagger, props.loop], syncPlayback)

onBeforeUnmount(() => {
  disposed = true
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  motion?.removeEventListener('change', syncPlayback)
  document.removeEventListener('visibilitychange', syncPlayback)
  document.fonts.removeEventListener('loadingdone', updateTexture)
  canvas.value?.removeEventListener('webglcontextlost', onContextLost)
  canvas.value?.removeEventListener('webglcontextrestored', initialize)
  renderer?.dispose()
})
</script>

<template>
  <div
    ref="host"
    class="webgl-text"
    :style="{ color, fontFamily, fontWeight, fontStyle, letterSpacing: `${Number.isFinite(letterSpacing) ? letterSpacing : 0}em` }"
  >
    <span :class="ready ? 'sr-only' : 'webgl-text__fallback'">{{ text }}</span>
    <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': ready }" />
  </div>
</template>

<style scoped lang="scss">
.webgl-text {
  position: relative;
  inline-size: 100%;
  min-inline-size: 0;
  block-size: var(--webgl-text-height, clamp(15rem, 38vw, 30rem));
  display: grid;
  place-items: center;

  canvas {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    visibility: hidden;

    &.is-ready { visibility: visible; }
  }

  &__fallback {
    padding: var(--space-6);
    font-size: clamp(2rem, 8vw, 8rem);
    line-height: var(--leading-tight);
    white-space: pre-line;
    text-align: center;
    overflow-wrap: anywhere;
  }
}
</style>
