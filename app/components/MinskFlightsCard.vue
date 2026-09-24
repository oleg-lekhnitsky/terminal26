<script setup lang="ts">
const { navigationHaptic } = useNavigationHaptics()
import { motionSystem, typographySystem } from '~/utils/textRenderer'
import type { MinskDepartures } from '~/utils/minskFlights'

const host = useTemplateRef('host')
const { activeFont } = useFontSelection()
const timeSize = ref(26)
// Fit the widest time for each face, including italic glyph overhang.
// Measuring at a fixed size makes the result independent of card width.
watch(activeFont, async (font, _, onCleanup) => {
  if (!import.meta.client) return
  let cancelled = false
  onCleanup(() => { cancelled = true })
  timeSize.value = 26
  const descriptor = `${font.style} ${font.weight} 100px "AB Terminal"`
  await document.fonts.load(descriptor, '0123456789:')
  if (cancelled) return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  context.font = descriptor
  let widest = 0
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute++) {
      const metrics = context.measureText(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      widest = Math.max(widest, metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
    }
  }
  timeSize.value = Math.min(33, 86 * 100 / widest)
}, { immediate: true })
const { data, error, status, execute } = useFetch<MinskDepartures>('/api/minsk-flights', { server: false, immediate: false })
const page = ref(0)
const pageSize = 1
const pageCount = computed(() => Math.ceil((data.value?.flights.length ?? 0) / pageSize))
const flight = computed(() => data.value?.flights[page.value])
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' })
const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Minsk', day: '2-digit', month: 'short' })
const time = (value: string) => clock.format(new Date(value))
const reducedMotion = ref(false)
const transitionDuration = computed(() => reducedMotion.value ? 0 : ({
  enter: (motionSystem.exit / 2 + motionSystem.enter + motionSystem.stagger * 3) * 1000,
  leave: (motionSystem.exit + motionSystem.stagger * 3 / 2) * 1000,
}))
const motionStyle = {
  '--flight-tracking': `${typographySystem.letterSpacing}em`,
  '--flight-enter': `${motionSystem.enter}s`,
  '--flight-exit': `${motionSystem.exit}s`,
  '--flight-stagger': `${motionSystem.stagger}s`,
  '--flight-overlap': `${motionSystem.exit / 2}s`,
  '--flight-travel': `${motionSystem.travel}em`,
  '--flight-hover': `${motionSystem.rest}s`,
}
let observer: IntersectionObserver | undefined
let refreshTimer: ReturnType<typeof setInterval> | undefined
let pageTimer: ReturnType<typeof setInterval> | undefined
let motion: MediaQueryList | undefined
let visible = false
let disposed = false
let lastRefresh = 0
async function refresh() {
  if (status.value === 'pending') return
  await execute()
  if (disposed) return
  lastRefresh = error.value ? 0 : Date.now()
  if (page.value >= pageCount.value) page.value = 0
}
function changeFlight(direction: number) {
  if (pageCount.value < 2) return
  page.value = (page.value + direction + pageCount.value) % pageCount.value
  sync()
}
function sync() {
  reducedMotion.value = motion?.matches ?? false
  clearInterval(refreshTimer); clearInterval(pageTimer)
  if (disposed || !visible || document.hidden) return
  if (Date.now() - lastRefresh >= 60000) void refresh()
  refreshTimer = setInterval(() => { void refresh() }, 60000)
  if (!motion?.matches) pageTimer = setInterval(() => {
    if (pageCount.value > 1) page.value = (page.value + 1) % pageCount.value
  }, motionSystem.hold * 20 * 1000)
}
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motion.matches
  motion.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => {
  disposed = true; clearInterval(refreshTimer); clearInterval(pageTimer); observer?.disconnect()
  motion?.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="flights-pin" :style="motionStyle">
    <div class="flights-pin__art">
      <div v-if="flight" class="flights-pin__board">
        <Transition name="flights" :duration="transitionDuration">
          <article :key="flight.id" class="flights-pin__slide">
            <header class="flights-pin__heading">
              <div class="flights-pin__mask"><div class="flight-step" style="--step: 0">
              <p class="flights-pin__destination" :style="{ fontSize: `${flight.destination.length > 30 ? 4.2 : 5.5}cqw` }">{{ flight.destination }}</p>
              <p class="flights-pin__status" :class="{ 'is-alert': flight.cancelled || flight.delayed, 'is-boarding': /boarding/i.test(flight.status) }">{{ flight.status }}<span v-if="flight.estimated && !flight.cancelled"> / {{ time(flight.estimated) }}</span></p>
              </div></div>
            </header>
            <div class="flights-pin__departure">
              <div class="flights-pin__mask"><time class="flights-pin__time flight-step" :style="{ '--step': 1, fontSize: `${timeSize}cqw` }" :datetime="flight.scheduled" aria-label="Departure time in Minsk, UTC+3">{{ time(flight.scheduled) }}</time></div>
              <div class="flights-pin__details flight-step" style="--step: 2">
                <p>{{ flight.flight }}</p>
                <p :aria-label="`Gate ${flight.gate || 'not assigned'}`">{{ flight.gate || '—' }}</p>
              </div>
            </div>
            <footer class="flight-step" style="--step: 3">
              <p class="flights-pin__date">{{ date.format(new Date(flight.scheduled)) }}</p>
              <p class="flights-pin__airport">MINSK NATIONAL / MSQ</p>
            </footer>
          </article>
        </Transition>
      </div>
      <div v-else class="flights-pin__empty"><p>{{ error ? 'Departures unavailable' : data ? 'No upcoming departures' : 'Checking departures…' }}</p><button v-if="error" type="button" @click="refresh">Try again</button></div>
      <template v-if="flight && pageCount > 1">
        <button class="flights-pin__nav flights-pin__nav--previous" type="button" aria-label="Previous departure" @click="changeFlight(-1); navigationHaptic()" />
        <button class="flights-pin__nav flights-pin__nav--next" type="button" aria-label="Next departure" @click="changeFlight(1); navigationHaptic()" />
      </template>
    </div>
    <p v-if="error && data" class="flights-pin__notice" role="status">Update unavailable</p>
    <figcaption><span>Departures</span><a href="https://airport.by/en/raspisanie-rejsov/vylety" target="_blank" rel="noopener noreferrer">Minsk Airport ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.flights-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { container-type: inline-size; position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius-xl); background: #100315; color: #f6eed9; font-family: var(--font-sans); font-weight: var(--specimen-weight, 700); font-style: var(--specimen-style, normal); letter-spacing: var(--flight-tracking); }
  &__board, &__slide { position: absolute; inset: 0; }
  p { margin: 0; }
  &__mask { overflow: hidden; padding-block: .12em; margin-block: -.12em; }
  &__slide { text-transform: uppercase; text-align: center; }
  &__heading { position: absolute; top: 6cqw; inset-inline: 7cqw; }
  &__destination { line-height: 1.2; letter-spacing: .08em; text-wrap: balance; overflow-wrap: anywhere; }
  &__status { margin-top: 1cqw !important; font-size: 5.5cqw; line-height: 1.2; letter-spacing: .08em; color: #625364; }
  &__status.is-alert { color: #ff987e; }
  &__status.is-boarding { color: #cce99c; }
  &__departure { position: absolute; top: 49cqw; inset-inline: 5cqw; }
  &__time { display: block; font-size: 33cqw; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; }
  &__details { margin-top: 5cqw; padding-inline: 4cqw; font-size: 3cqw; line-height: 1.5; letter-spacing: .08em; color: #625364; overflow-wrap: anywhere; }
  footer { position: absolute; bottom: 7cqw; inset-inline: 7cqw; color: #625364; }
  &__date { font-size: 5.5cqw; line-height: 1.2; letter-spacing: .12em; }
  &__airport { margin-top: 3cqw !important; font-size: 2cqw; letter-spacing: .25em; }
  &__empty { position: absolute; inset: 32cqw 7cqw 14cqw; display: grid; place-content: center; text-align: center; font-size: 3.6cqw; }
  &__notice { padding: var(--space-2); font-size: var(--text-sm); }
  button:not(.flights-pin__nav) { font: inherit; color: inherit; border: 0; background: transparent; padding: .6em; cursor: pointer; text-decoration: underline; text-underline-offset: .2em; }
  button:not(.flights-pin__nav):active { transform: scale(.96); }
  &__nav { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    position: absolute; z-index: 2; top: 0; bottom: 0; width: 35%;
    border: 0; padding: 0; background: transparent; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    &::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity var(--flight-hover) var(--ease-flow); pointer-events: none; }
    &--previous { left: 0; }
    &--next { right: 0; }
    &--previous::before { background: linear-gradient(to right, rgb(255 255 255 / .08), transparent); }
    &--next::before { background: linear-gradient(to left, rgb(255 255 255 / .08), transparent); }
    &:focus-visible { outline: 2px solid #f6eed9; outline-offset: -4px; }
    &:focus-visible::before, &:active::before { opacity: 1; }
    @media (hover: hover) { &:hover::before { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { &::before { transition: none; } }
  }
  figcaption { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
  a { color: inherit; font-size: .75em; text-underline-offset: .2em; }
}
.flights-enter-active .flight-step,
.flights-leave-active .flight-step {
  transition-property: transform, opacity;
  transition-timing-function: var(--ease-flow);
}
.flights-enter-active .flight-step {
  transition-duration: var(--flight-enter);
  transition-delay: calc(var(--flight-overlap) + var(--step) * var(--flight-stagger));
}
.flights-leave-active { pointer-events: none; }
.flights-leave-active .flight-step {
  transition-duration: var(--flight-exit);
  transition-delay: calc(var(--step) * var(--flight-stagger) / 2);
}
.flights-enter-from .flight-step { opacity: 0; transform: translateY(var(--flight-travel)); }
.flights-leave-to .flight-step { opacity: 0; transform: translateY(calc(var(--flight-travel) / -2)); }
@media (prefers-reduced-motion: reduce) {
  .flights-enter-active .flight-step, .flights-leave-active .flight-step { transition: none; }
  .flights-enter-from .flight-step, .flights-leave-to .flight-step { transform: none; }
}
</style>
