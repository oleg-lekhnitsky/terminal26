<script setup lang="ts">
import { createFrameGate, renderBudget } from '~/utils/renderBudget'
import { alphabetPair, cubeHiddenFaces, cubePose } from '~/utils/cubeMotion'
import { typographySystem } from '~/utils/textRenderer'

const host = useTemplateRef('host')
const cube = useTemplateRef('cube')
const faces = ref(Array.from({ length: 6 }, (_, index) => alphabetPair(index)))
let nextLetter = 6
let hidden = cubeHiddenFaces(0, 0)
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let visible = false
const frameGate = createFrameGate(renderBudget.fps)
let frame = 0
let previous = 0
let time = 0

function stop() {
  cancelAnimationFrame(frame)
  frame = 0
  previous = 0
  frameGate.reset()
}

function tick(now: number) {
  const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0
  previous = now
  time += delta
  if (!frameGate.shouldDraw(now)) { frame = requestAnimationFrame(tick); return }
  const pose = cubePose(time)
  if (cube.value) cube.value.style.transform = `rotateZ(${pose.z}deg) rotateX(${pose.x}deg) rotateY(${pose.y}deg)`
  const nextHidden = cubeHiddenFaces(pose.x, pose.y)
  nextHidden.forEach((isHidden, index) => {
    // Replace a face only when it has just turned fully away from the viewer.
    if (isHidden && !hidden[index]) faces.value[index] = alphabetPair(nextLetter++)
  })
  hidden = nextHidden
  frame = requestAnimationFrame(tick)
}

function syncPlayback() {
  stop()
  if (visible && !document.hidden && !motion?.matches) frame = requestAnimationFrame(tick)
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
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  motion?.removeEventListener('change', syncPlayback)
  document.removeEventListener('visibilitychange', syncPlayback)
})
</script>

<template>
  <figure ref="host" class="cube-pin">
    <div class="cube-pin__art" role="img" aria-label="Rotating cube with changing uppercase and lowercase letter pairs">
      <div class="cube-pin__scene" aria-hidden="true">
        <div ref="cube" class="letter-cube" :style="{ letterSpacing: `${typographySystem.letterSpacing}em` }">
          <div v-for="(pair, index) in faces" :key="index" class="letter-cube__face" :class="`letter-cube__face--${index}`">
            {{ pair }}
          </div>
        </div>
      </div>
    </div>
    <figcaption>Letter cube</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.cube-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    position: relative;
    container-type: inline-size;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #121212;
  }

  &__scene {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    perspective: 180cqw;
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}

.letter-cube {
  position: relative;
  inline-size: 56cqw;
  block-size: 56cqw;
  transform-style: preserve-3d;
  transform: rotateX(0deg) rotateY(0deg);
  font-family: var(--font-sans);
  font-size: 26cqw;
  font-weight: var(--specimen-weight, 700);
  font-style: var(--specimen-style, normal);
  line-height: 1;
  font-kerning: normal;
  color: #080909;

  &__face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    backface-visibility: hidden;
    border: 0;
    background: #f5f6f7;

    &--0 { transform: translateZ(28cqw); }
    &--1 { transform: rotateY(90deg) translateZ(28cqw); }
    &--2 { transform: rotateY(180deg) translateZ(28cqw); }
    &--3 { transform: rotateY(-90deg) translateZ(28cqw); }
    &--4 { transform: rotateX(90deg) translateZ(28cqw); }
    &--5 { transform: rotateX(-90deg) translateZ(28cqw); }
  }
}
</style>
