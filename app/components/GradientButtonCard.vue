<script setup lang="ts">
import { motionSystem } from '~/utils/textRenderer'

const host = useTemplateRef('host')
const pulse = ref(0)
const playing = ref(false)
let visible = false
let observer: IntersectionObserver | undefined
function sync() { playing.value = visible && !document.hidden }
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
  document.addEventListener('visibilitychange', sync)
})
onBeforeUnmount(() => { observer?.disconnect(); document.removeEventListener('visibilitychange', sync) })
const hue = computed(() => (120 + pulse.value * 55) % 360)
const colors = computed(() => ({
  '--surface': `hsl(${hue.value + 92} 79% 80%)`,
  '--rim': `hsl(${hue.value + 51} 97% 68%)`,
  '--halo': `hsl(${hue.value - 34} 98% 80%)`,
  '--core': `hsl(${hue.value - 5} 75% 57%)`,
  '--core-clear': `hsl(${hue.value - 5} 75% 57% / 0)`,
  '--button': `hsl(${hue.value - 5} 66% 44% / .42)`,
  '--color-duration': `${motionSystem.enter}s`,
  '--pulse-duration': `${motionSystem.enter * 2}s`,
  '--breath-duration': `${motionSystem.enter * 8}s`,
  '--press-duration': `${motionSystem.rest}s`,
  '--play-state': playing.value ? 'running' : 'paused',
}))
</script>

<template>
  <figure ref="host" class="gradient-pin">
    <div class="gradient-pin__art" :style="colors">
      <div class="gradient-pin__field" aria-hidden="true">
        <div class="gradient-pin__rim" />
        <div class="gradient-pin__halo" />
        <div class="gradient-pin__core" />
      </div>
      <span v-if="pulse" :key="pulse" class="gradient-pin__pulse" aria-hidden="true" />
      <button type="button" class="gradient-pin__button" aria-label="Change hue and pulse" @click="pulse++">Breathe</button>
    </div>
    <figcaption>Gradient field</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.gradient-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;
  &__art {
    container-type: inline-size;
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    aspect-ratio: 5 / 4;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: var(--surface);
    transition: background-color var(--color-duration) var(--ease-flow);
  }
  &__field {
    position: absolute;
    inset: 9% 10%;
    pointer-events: none;
    animation: gradient-breathe var(--breath-duration) var(--ease-flow) infinite;
    animation-play-state: var(--play-state);
  }
  &__rim, &__halo, &__core {
    position: absolute;
    border-radius: 32%;
    transition: background-color var(--color-duration) var(--ease-flow);
  }
  &__rim { inset: 0; background: var(--rim); filter: blur(2.4cqw); }
  &__halo { inset: 3%; background: var(--halo); filter: blur(2cqw); }
  &__core { inset: 15%; background: var(--core); filter: blur(8cqw); border-radius: 40%; }
  &__pulse {
    position: absolute;
    inline-size: 48cqw;
    block-size: 32cqw;
    // Fade inside the layer bounds so Safari cannot clip an expanding blur surface.
    background: radial-gradient(ellipse closest-side, var(--core) 0%, var(--core-clear) 100%);
    pointer-events: none;
    animation: gradient-pulse var(--pulse-duration) var(--ease-flow) both;
  }
  &__button {
    appearance: none;
    -webkit-appearance: none;
    position: relative;
    display: grid;
    place-items: center;
    min-inline-size: 24cqw;
    min-block-size: max(9cqw, 44px);
    padding: .02cqw 3cqw;
    border: 0;
    border-radius: 999px;
    background: var(--button);
    color: #fffbe8cc;
    font-family: var(--font-sans);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    font-size: 4cqw;
    letter-spacing: .08em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background-color var(--color-duration) var(--ease-flow), transform var(--press-duration) var(--ease-flow);
    &:active { transform: scale(.96); }
    &:focus-visible { outline: 2px solid #fffbe8; outline-offset: 1cqw; }
  }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
@keyframes gradient-breathe {
  0%, 100% { transform: scale(.87); }
  50% { transform: scale(1.04); }
}
@keyframes gradient-pulse {
  from { transform: scale(1); opacity: .65; }
  to { transform: scale(2, 1.7); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .gradient-pin__art, .gradient-pin__button, .gradient-pin__rim, .gradient-pin__halo, .gradient-pin__core { transition: none; }
  .gradient-pin__field { animation: none; }
  .gradient-pin__pulse { animation: none; display: none; }
}
</style>
