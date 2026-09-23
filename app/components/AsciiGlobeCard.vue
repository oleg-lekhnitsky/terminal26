<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { flow, motionSystem } from '~/utils/textRenderer'

const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const { activeFont } = useFontSelection()
const ramp = 'ABTERMINALo.'
let land: Uint8ClampedArray | undefined
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let reduced: MediaQueryList | undefined
const frameGate = createFrameGate(renderBudget.matrixFps)
let frame = 0
let visible = false
let disposed = false
let elapsed = 0
let previous = 0

function draw() {
  const context = canvas.value?.getContext('2d')
  if (!context || !canvas.value) return
  context.setTransform(canvas.value.width / 600, 0, 0, canvas.value.height / 600, 0, 0)
  context.clearRect(0, 0, 600, 600)
  const leg = motionSystem.enter * 4 + motionSystem.hold * 2
  const phase = elapsed % (leg * 2)
  const progress = flow(Math.min(1, (phase % leg) / (motionSystem.enter * 4)))
  const amount = reduced?.matches ? 0 : phase < leg ? progress : 1 - progress
  const columns = Math.round(64 - 26 * amount)
  const cell = 600 / columns
  const radius = 244
  const rotation = .35 + elapsed / (motionSystem.enter * 30) * Math.PI * 2
  const tilt = .18
  context.font = `${activeFont.value.style} ${activeFont.value.weight} ${cell * .96}px "AB Terminal"`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff4d6'
  for (let row = 0; row < columns; row++) {
    for (let col = 0; col < columns; col++) {
      const x = (col + .5) * cell, y = (row + .5) * cell
      const nx = (x - 300) / radius, ny = (300 - y) / radius
      const squared = nx * nx + ny * ny
      if (squared >= 1) continue
      const nz = Math.sqrt(1 - squared)
      const latitude = Math.asin(ny * Math.cos(tilt) + nz * Math.sin(tilt))
      const longitude = Math.atan2(nx, nz * Math.cos(tilt) - ny * Math.sin(tilt)) + rotation
      const u = ((longitude / (Math.PI * 2) + .5) % 1 + 1) % 1
      const v = .5 - latitude / Math.PI
      const mapX = Math.min(719, Math.floor(u * 720)), mapY = Math.min(359, Math.max(0, Math.floor(v * 360)))
      const onLand = land && land[(mapY * 720 + mapX) * 4 + 3]! > 100
      const character = onLand ? ramp[(Math.floor(u * 90) + Math.floor(v * 45)) % 10]! : 'o'
      context.globalAlpha = onLand ? .55 + nz * .45 : .13 + nz * .14
      context.fillText(character, x, y, cell * .94)
    }
  }
  context.globalAlpha = 1
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
  if (!cancelled) draw()
}, { immediate: true })
onMounted(() => {
  const image = new Image()
  image.src = '/images/globe/land.svg'
  void image.decode().then(() => {
    if (disposed) return
    const source = document.createElement('canvas')
    source.width = 720; source.height = 360
    const context = source.getContext('2d')
    if (!context) return
    context.drawImage(image, 0, 0)
    land = context.getImageData(0, 0, 720, 360).data
    draw()
  }).catch(() => { /* Retain the character sphere if the map cannot load. */ })
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
  resizeObserver = new ResizeObserver(() => {
    if (!canvas.value) return
    const size = Math.round(canvas.value.clientWidth * Math.min(devicePixelRatio || 1, 2))
    canvas.value.width = size
    canvas.value.height = size
    draw()
  })
  if (canvas.value) resizeObserver.observe(canvas.value)
})
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  reduced?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="globe-pin">
    <div class="globe-pin__art">
      <canvas ref="canvas" role="img" aria-label="A rotating Earth made of letters, with changing character sizes">A rotating Earth made of letters.</canvas>
    </div>
    <figcaption>ASCII globe</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.globe-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { aspect-ratio: 1; overflow: hidden; border-radius: var(--radius-xl); background: #2e5dff; }
  canvas { display: block; width: 100%; height: 100%; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
</style>
