<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { flow, motionSystem } from '~/utils/textRenderer'

const host = useTemplateRef('host')
const canvas = useTemplateRef('canvas')
const { activeFont } = useFontSelection()
const ramp = 'iltrcvsxIZAENMW'
let silhouette: HTMLCanvasElement | undefined
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let reduced: MediaQueryList | undefined
const frameGate = createFrameGate(renderBudget.matrixFps)
let frame = 0
let visible = false
let elapsed = 0
let previous = 0

// Eight pose studies from alternating frames of Muybridge's Annie G., plate 626.
// Coordinates are joint/hoof offsets from each limb's shoulder or hip.
// Order: far hind, near hind, far fore, near fore.
// https://www.nga.gov/artworks/167044-plate-number-626-annie-g-galloping
const stridePoses = [
  [[-27, 35, 12, 67], [6, 38, 48, 69], [20, 42, -29, 74], [-12, 57, -48, 120]],
  [[9, 32, 50, 67], [33, 31, 64, 66], [35, 33, -7, 55], [13, 48, -26, 74]],
  [[19, 55, 29, 115], [35, 38, 71, 70], [38, 24, 4, 49], [44, 29, 55, 75]],
  [[-15, 59, -28, 116], [21, 56, 31, 116], [42, 27, 62, 78], [40, 35, 87, 84]],
  [[-45, 41, -87, 99], [-7, 61, -12, 113], [29, 55, 30, 115], [43, 42, 77, 105]],
  [[-57, 21, -100, 48], [-44, 39, -79, 99], [1, 64, -9, 118], [33, 56, 66, 114]],
  [[-43, 13, -73, 48], [-51, 29, -87, 46], [-26, 52, -69, 98], [7, 66, 13, 119]],
  [[-23, 30, 10, 53], [-30, 37, 6, 68], [-8, 47, -44, 58], [-13, 61, -48, 117]],
] as const
const strideLift = [0, -10, -5, 2, 5, 3, 1, -2]

function draw() {
  const context = canvas.value?.getContext('2d')
  if (!context || !canvas.value) return
  context.setTransform(canvas.value.width / 600, 0, 0, canvas.value.height / 600, 0, 0)
  context.clearRect(0, 0, 600, 600)
  silhouette ??= document.createElement('canvas')
  const maskSize = renderBudget.silhouetteSize
  if (silhouette.width !== maskSize) { silhouette.width = maskSize; silhouette.height = maskSize }
  const shape = silhouette.getContext('2d', { willReadFrequently: true })
  if (!shape) return
  shape.setTransform(maskSize / 600, 0, 0, maskSize / 600, 0, 0)
  shape.clearRect(0, 0, 600, 600)
  const cycle = (elapsed / motionSystem.enter) % 1
  const phase = cycle * Math.PI * 2
  const poseTime = cycle * stridePoses.length
  const poseIndex = Math.floor(poseTime)
  const nextPose = (poseIndex + 1) % stridePoses.length
  const blend = poseTime - poseIndex
  const mix = (a: number, b: number) => a + (b - a) * blend
  const bob = mix(strideLift[poseIndex]!, strideLift[nextPose]!)
  shape.save()
  shape.translate(0, bob)
  shape.lineCap = 'round'
  shape.lineJoin = 'round'

  // Interpolate observed poses, rather than giving each leg an independent swing.
  const leg = (front: boolean, far: boolean) => {
    const limb = (front ? 2 : 0) + (far ? 0 : 1)
    const from = stridePoses[poseIndex]![limb]!
    const to = stridePoses[nextPose]![limb]!
    const hipX = front ? 357 : 216
    const hipY = front ? 300 : 307
    const kneeX = hipX + mix(from[0], to[0])
    const kneeY = hipY + mix(from[1], to[1])
    const footX = hipX + mix(from[2], to[2])
    const footY = hipY + mix(from[3], to[3])
    shape.strokeStyle = far ? '#888' : '#eee'
    shape.lineWidth = front ? 20 : 26
    shape.beginPath(); shape.moveTo(hipX, hipY); shape.lineTo(kneeX, kneeY); shape.stroke()
    shape.lineWidth = 11
    shape.beginPath(); shape.moveTo(kneeX, kneeY); shape.lineTo(footX, footY); shape.stroke()
    shape.lineWidth = 14
    shape.beginPath(); shape.moveTo(footX - 4, footY); shape.lineTo(footX + 7, footY + 3); shape.stroke()
  }
  leg(false, true); leg(true, true)

  // Flowing tail, barrel, rising neck, muzzle, and pointed ears.
  shape.strokeStyle = '#bbb'
  for (let strand = 0; strand < 5; strand++) {
    shape.lineWidth = 5
    shape.beginPath()
    shape.moveTo(195, 265)
    shape.bezierCurveTo(149, 233, 125, 285 + Math.sin(phase + strand * .4) * 13, 78 + strand * 7, 258 + strand * 9 + Math.sin(phase + strand * .4) * 15)
    shape.stroke()
  }
  shape.fillStyle = '#eee'
  shape.beginPath()
  shape.moveTo(182, 280)
  shape.bezierCurveTo(179, 241, 216, 236, 260, 249)
  shape.bezierCurveTo(298, 259, 322, 255, 344, 233)
  shape.bezierCurveTo(361, 212, 371, 185, 389, 183)
  shape.lineTo(392, 159); shape.lineTo(402, 180)
  shape.lineTo(413, 160); shape.lineTo(414, 185)
  shape.bezierCurveTo(431, 187, 444, 203, 455, 212)
  shape.lineTo(481, 226)
  shape.quadraticCurveTo(489, 247, 470, 250)
  shape.lineTo(428, 233)
  shape.quadraticCurveTo(408, 234, 406, 258)
  shape.bezierCurveTo(397, 288, 392, 316, 365, 329)
  shape.bezierCurveTo(330, 343, 303, 332, 275, 327)
  shape.bezierCurveTo(224, 342, 191, 329, 182, 280)
  shape.fill()
  shape.strokeStyle = '#999'
  shape.lineWidth = 7
  for (let strand = 0; strand < 11; strand++) {
    const y = 191 + strand * 5
    const x = 384 - strand * 2.5
    shape.beginPath(); shape.moveTo(x, y)
    shape.lineTo(x - 19 - Math.sin(phase + strand * .5) * 5, y + 4)
    shape.stroke()
  }
  leg(false, false); leg(true, false)
  shape.globalCompositeOperation = 'destination-out'
  shape.beginPath(); shape.ellipse(424, 207, 4, 4, 0, 0, Math.PI * 2); shape.fill()
  shape.restore()

  const pixels = shape.getImageData(0, 0, maskSize, maskSize).data
  // Change the sampling density, keeping the horse's silhouette at the same scale.
  const sizeMove = motionSystem.enter * 4
  const sizeHold = motionSystem.hold * 2
  const sizeLeg = sizeMove + sizeHold
  const sizePhase = elapsed % (sizeLeg * 2)
  const progress = flow(Math.min(1, (sizePhase % sizeLeg) / sizeMove))
  const amount = reduced?.matches ? 0 : sizePhase < sizeLeg ? progress : 1 - progress
  const columns = Math.round(72 - 44 * amount)
  const rows = Math.round(columns * 5 / 6)
  const fontSize = 600 / columns * 1.08
  context.font = `${activeFont.value.style} ${activeFont.value.weight} ${fontSize}px "AB Terminal"`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#203d35'
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = Math.floor((col + .5) * 600 / columns)
      const y = Math.floor((row + .5) * 600 / rows)
      const index = (Math.min(maskSize - 1, Math.floor(y * maskSize / 600)) * maskSize + Math.min(maskSize - 1, Math.floor(x * maskSize / 600))) * 4
      if (pixels[index + 3]! < 80) continue
      const density = pixels[index]! / 255
      const texture = ((col * 7 + row * 11) % 5) * .055
      const character = ramp[Math.min(ramp.length - 1, Math.floor((density * .75 + texture) * (ramp.length - 1)))]!
      context.fillText(character, x, y, 600 / columns)
    }
  }
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
  cancelAnimationFrame(frame)
  observer?.disconnect()
  resizeObserver?.disconnect()
  reduced?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="ascii-pin">
    <div class="ascii-pin__art">
      <canvas ref="canvas" role="img" aria-label="A galloping horse formed from ASCII characters">A galloping horse
        formed from ASCII characters.</canvas>
    </div>
    <figcaption>ASCII gallop</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.ascii-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #daf759;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--color-text);
  }
}
</style>
