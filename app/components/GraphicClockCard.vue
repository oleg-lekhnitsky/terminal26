<script setup lang="ts">
import { motionSystem } from '~/utils/textRenderer'

withDefaults(defineProps<{ cropBottom?: boolean }>(), { cropBottom: false })

const dial = useTemplateRef('dial')
const timeLabel = ref('Local time')
let timer: ReturnType<typeof setTimeout> | undefined
let midnight = 0
let initialized = false

const numerals = Array.from({ length: 12 }, (_, index) => {
  const hour = index + 1
  const angle = hour * Math.PI / 6
  return { hour, x: 50 + Math.sin(angle) * 37, y: 50 - Math.cos(angle) * 37 }
})

function update() {
  clearTimeout(timer)
  if (document.hidden) return
  const now = new Date()
  // Unwrapped angles keep the hands moving forward through minute/day boundaries.
  const seconds = Math.floor((now.getTime() - midnight) / 1000)
  dial.value?.style.setProperty('--hours', `${seconds / 120}deg`)
  dial.value?.style.setProperty('--minutes', `${seconds / 10}deg`)
  dial.value?.style.setProperty('--seconds', `${seconds * 6}deg`)
  timeLabel.value = now.toLocaleTimeString([], { hour12: false })
  if (!initialized && dial.value) {
    // Set the first pose before enabling transitions, avoiding an initial spin.
    dial.value.getBoundingClientRect()
    dial.value.classList.add('clock-dial--ready')
    initialized = true
  }
  timer = setTimeout(update, 1000 - now.getMilliseconds())
}

onMounted(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  midnight = start.getTime()
  update()
  document.addEventListener('visibilitychange', update)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', update)
})
</script>

<template>
  <figure class="clock-pin" :class="{ 'clock-pin--cropped': cropBottom }">
    <div class="clock-pin__art" role="img" :aria-label="`Graphic clock, ${timeLabel}`">
      <svg ref="dial" class="clock-dial" viewBox="0 0 100 100" aria-hidden="true" :style="{ '--clock-duration': `${motionSystem.enter}s` }">
        <g class="clock-dial__ticks">
          <path v-for="tick in 60" :key="tick" :d="tick % 5 === 0 ? 'M50 3 V6' : 'M50 3 V4'" :transform="`rotate(${tick * 6} 50 50)`" />
        </g>
        <text v-for="number in numerals" :key="number.hour" :x="number.x" :y="number.y" text-anchor="middle" dominant-baseline="central">{{ number.hour }}</text>
        <path class="clock-dial__hand clock-dial__hand--hour" d="M50 54 V29" />
        <path class="clock-dial__hand clock-dial__hand--minute" d="M50 55 V20" />
        <path class="clock-dial__hand clock-dial__hand--second" d="M50 59 V9" />
        <circle cx="50" cy="50" r="2.2" class="clock-dial__hub" />
      </svg>
    </div>
    <figcaption>{{ cropBottom ? 'Clock crop' : 'Graphic clock' }}</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.clock-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    position: relative;
    container-type: inline-size;
    aspect-ratio: 22 / 22;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #f0bed0;
    color: #642a46;
  }

  &--cropped &__art { aspect-ratio: 22 / 18; }
  &--cropped .clock-dial {
    top: 95%;
    width: 150cqw;
    height: 150cqw;
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}

.clock-dial {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100cqw;
  height: 100cqw;
  max-inline-size: none;
  transform: translate(-50%, -50%);
  overflow: visible;
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: var(--specimen-weight, 700);
  font-style: var(--specimen-style, normal);
  fill: currentColor;

  &__ticks {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.45;
    opacity: 0.35;
  }

  &__hand {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.8;
    stroke-linecap: square;
    transform-origin: 50px 50px;
    &--hour { transform: rotate(var(--hours, 0deg)); stroke-width: 4; }
    &--minute { transform: rotate(var(--minutes, 0deg)); }
    &--second { transform: rotate(var(--seconds, 0deg)); stroke: #d9382e; stroke-width: 0.8; }
  }

  &--ready &__hand { transition: transform var(--clock-duration) var(--ease-flow); }
  &__hub { fill: #642a46; }
}

@media (prefers-reduced-motion: reduce) {
  .clock-dial--ready .clock-dial__hand { transition: none; }
}
</style>
