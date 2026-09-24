<script setup lang="ts">
const { navigationHaptic } = useNavigationHaptics()
import { motionSystem, typographySystem } from '~/utils/textRenderer'
import { weatherPalette, type CityWeather } from '~/utils/cityWeather'
import { weatherSky, type WeatherSky } from '~/utils/weatherSky'

const host = useTemplateRef('host')
const index = ref(0)
const { data, error, status, execute } = useFetch<CityWeather[]>('/api/city-weather', { server: false, immediate: false })
const current = computed(() => data.value?.[index.value])
const palette = computed(() => weatherPalette(current.value))
const sky = computed(() => weatherSky(current.value))
const renderedSky = shallowRef<WeatherSky>()
// Decode first so the current sky remains visible until its replacement is ready.
watch(sky, async (next, _previous, onCleanup) => {
  if (!import.meta.client) return
  if (!next) { renderedSky.value = undefined; return }
  let cancelled = false
  onCleanup(() => { cancelled = true })
  const image = new Image()
  image.src = next.src
  try {
    await image.decode()
    if (!cancelled) renderedSky.value = next
  } catch {
    if (!cancelled) renderedSky.value = undefined
  }
}, { immediate: true })
// Overlap by half an exit; each subsequent text group follows one shared beat.
const reducedMotion = ref(false)
let motionQuery: MediaQueryList | undefined
const syncMotion = () => { reducedMotion.value = motionQuery?.matches ?? false }
const transitionDuration = computed(() => reducedMotion.value ? 0 : ({
  enter: (motionSystem.exit / 2 + motionSystem.enter + motionSystem.stagger * 3) * 1000,
  leave: (motionSystem.exit + motionSystem.stagger * 3 / 2) * 1000,
}))
const motionStyle = {
  '--weather-tracking': `${typographySystem.letterSpacing}em`,
  '--weather-enter': `${motionSystem.enter}s`,
  '--weather-exit': `${motionSystem.exit}s`,
  '--weather-stagger': `${motionSystem.stagger}s`,
  '--weather-overlap': `${motionSystem.exit / 2}s`,
  '--weather-travel': `${motionSystem.travel}em`,
  '--weather-hover': `${motionSystem.rest}s`,
}
let observer: IntersectionObserver | undefined
let timer: ReturnType<typeof setInterval> | undefined
let visible = false
let lastRefresh = 0
let disposed = false
async function refresh() {
  if (status.value === 'pending') return
  await execute()
  if (!disposed) lastRefresh = error.value ? 0 : Date.now()
}
function changeCity(direction: number) {
  const count = data.value?.length ?? 0
  if (count < 2) return
  index.value = (index.value + direction + count) % count
  sync()
}
function sync() {
  clearInterval(timer)
  if (disposed || !visible || document.hidden) return
  if (Date.now() - lastRefresh > 600000) void refresh()
  timer = setInterval(() => {
    if (data.value?.length) index.value = (index.value + 1) % data.value.length
    if (Date.now() - lastRefresh > 600000) void refresh()
  }, motionSystem.enter * 30 * 1000)
}
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotion()
  motionQuery.addEventListener('change', syncMotion)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    sync()
  })
  if (host.value) observer.observe(host.value)
  document.addEventListener('visibilitychange', sync)
})
onBeforeUnmount(() => {
  disposed = true
  motionQuery?.removeEventListener('change', syncMotion)
  clearInterval(timer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="weather-pin" :style="motionStyle">
    <div class="weather-pin__art" :style="{ ...palette, color: current ? '#fff' : palette.color }">
      <div v-if="current" class="weather-pin__sky" aria-hidden="true">
        <Transition name="sky">
          <img v-if="renderedSky" :key="renderedSky.src" :src="renderedSky.src" alt="" :style="{ filter: `brightness(${renderedSky.brightness})` }">
        </Transition>
        <div class="weather-pin__scrim" />
      </div>
      <Transition name="weather" :duration="transitionDuration">
        <div v-if="current" :key="current.city" class="weather-pin__content">
          <div class="weather-pin__mask"><p class="weather-pin__city weather-step" style="--step: 0">{{ current.city }}</p></div>
          <div class="weather-pin__reading">
            <div class="weather-pin__mask"><p class="weather-pin__temperature weather-step" :style="{ '--step': 1, fontSize: `${String(current.temperature).length > 2 ? 36 : 46}cqw` }">{{ current.temperature }}</p></div>
            <p class="weather-pin__condition weather-step" style="--step: 2">{{ current.condition }}</p>
          </div>
          <div class="weather-pin__details weather-step" style="--step: 3">
            <p>Feels like {{ current.feelsLike }} C</p>
            <p>Wind {{ current.wind }} km/h · Humidity {{ current.humidity }}%</p>
            <p v-if="error">Update unavailable</p>
          </div>
        </div>
        <div v-else class="weather-pin__empty">
          <p>{{ error ? 'Weather unavailable' : 'Checking the weather…' }}</p>
          <button v-if="error" type="button" @click="refresh">Try again</button>
        </div>
      </Transition>
      <template v-if="current && (data?.length ?? 0) > 1">
        <button class="weather-pin__nav weather-pin__nav--previous" type="button" aria-label="Previous weather city" @click="changeCity(-1); navigationHaptic()" />
        <button class="weather-pin__nav weather-pin__nav--next" type="button" aria-label="Next weather city" @click="changeCity(1); navigationHaptic()" />
      </template>
    </div>
    <figcaption><span>Weather</span><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.weather-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { position: relative; container-type: inline-size; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius-xl); background: #f1d58a; color: #473414; text-align: center; font-family: var(--font-sans); font-weight: var(--specimen-weight, 700); font-style: var(--specimen-style, normal); letter-spacing: var(--weather-tracking); }
  &__art { transition: background-color var(--weather-enter) var(--ease-flow), color var(--weather-enter) var(--ease-flow); }
  &__sky, &__sky img, &__scrim { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  &__sky img { object-fit: cover; transition: opacity var(--weather-enter) var(--ease-flow), filter var(--weather-enter) var(--ease-flow); }
  &__sky img.sky-enter-from, &__sky img.sky-leave-to { opacity: 0; }
  &__scrim { background: linear-gradient(180deg, rgba(5, 19, 38, .32), rgba(5, 19, 38, .25) 45%, rgba(5, 19, 38, .64)); }
  p { margin: 0; }
  &__content { position: absolute; inset: 0; padding: 7cqw 5cqw; display: flex; flex-direction: column; justify-content: space-between; text-shadow: 0 1px 10px rgba(0, 0, 0, .15); }
  &__mask { overflow: hidden; padding-block: .12em; margin-block: -.12em; }
  &__city { font-size: 8cqw; line-height: 1.1; }
  &__temperature { line-height: 1; white-space: nowrap; }
  &__condition { font-size: 5cqw; margin-top: 3cqw !important; }
  &__details { font-size: 3cqw; line-height: 1.65; }
  &__empty { position: absolute; inset: 0; display: grid; place-content: center; gap: var(--space-3); font-size: 4cqw; }
  button:not(.weather-pin__nav) { font: inherit; color: inherit; padding: .5em 1em; border: 1px solid currentColor; border-radius: 999px; background: transparent; cursor: pointer; }
  &__nav { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    position: absolute; z-index: 2; top: 0; bottom: 0; width: 35%;
    border: 0; border-radius: 0; padding: 0; background: transparent; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    &::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity var(--weather-hover) var(--ease-flow); pointer-events: none; }
    &--previous { left: 0; }
    &--next { right: 0; }
    &--previous::before { background: linear-gradient(to right, rgb(0 0 0 / .25), transparent); }
    &--next::before { background: linear-gradient(to left, rgb(0 0 0 / .25), transparent); }
    &:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }
    &:focus-visible::before, &:active::before { opacity: 1; }
    @media (hover: hover) { &:hover::before { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { &::before { transition: none; } }
  }
  figcaption { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
  a { color: inherit; font-size: .75em; text-underline-offset: .2em; }
}
// Animate text groups independently; the composition itself stays anchored.
.weather-enter-active .weather-step,
.weather-leave-active .weather-step {
  transition-property: transform, opacity;
  transition-timing-function: var(--ease-flow);
}
.weather-enter-active .weather-step {
  transition-duration: var(--weather-enter);
  transition-delay: calc(var(--weather-overlap) + var(--step) * var(--weather-stagger));
}
.weather-leave-active { pointer-events: none; }
.weather-leave-active .weather-step {
  transition-duration: var(--weather-exit);
  transition-delay: calc(var(--step) * var(--weather-stagger) / 2);
}
.weather-enter-from .weather-step { opacity: 0; transform: translateY(var(--weather-travel)); }
.weather-leave-to .weather-step { opacity: 0; transform: translateY(calc(var(--weather-travel) / -2)); }
.weather-pin__empty.weather-enter-active,
.weather-pin__empty.weather-leave-active { transition: opacity var(--weather-exit) var(--ease-flow); }
.weather-pin__empty.weather-enter-from,
.weather-pin__empty.weather-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .weather-enter-active .weather-step, .weather-leave-active .weather-step,
  .weather-pin__empty, .weather-pin__art, .weather-pin__sky img { transition: none; }
  .weather-enter-from .weather-step, .weather-leave-to .weather-step { transform: none; }
}
</style>
