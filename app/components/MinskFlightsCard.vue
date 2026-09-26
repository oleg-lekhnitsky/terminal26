<script setup lang="ts">
const { navigationHaptic } = useNavigationHaptics()
import { motionSystem, typographySystem } from '~/utils/textRenderer'
import type { MinskDepartures } from '~/utils/minskFlights'

const host = useTemplateRef('host')
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
            <header class="flights-pin__heading flight-step" style="--step: 0">
              <p>{{ flight.flight }}</p>
              <p class="flights-pin__status" :class="{ 'is-alert': flight.cancelled || flight.delayed }">{{
                flight.status }}</p>
            </header>
            <div class="flights-pin__route flight-step" style="--step: 1">
              <div>
                <p class="flights-pin__code">MSQ</p>
                <p class="flights-pin__city">Minsk</p>
              </div>
              <svg class="flights-pin__path" viewBox="0 0 120 60" aria-hidden="true">
                <path d="M-8 46 Q60 -8 128 46" fill="none" stroke="currentColor" stroke-width="1.5"
                  stroke-dasharray="2 4" />
                <circle cx="-8" cy="46" r="3" fill="currentColor" />
                <circle cx="128" cy="46" r="3" fill="currentColor" />
                <g transform="translate(48 7) rotate(90 12 12)" fill="currentColor">
                  <path d="M10 0h4v8h4v4h4v4h-8v4h4v4H6v-4h4v-4H2v-4h4V8h4z" />
                </g>
              </svg>
              <div class="flights-pin__arrival">
                <p v-if="flight.destinationCode" class="flights-pin__code">{{ flight.destinationCode }}</p>
                <p :class="flight.destinationCode ? 'flights-pin__city' : 'flights-pin__destination'">{{
                  flight.destination }}</p>
              </div>
            </div>
            <footer class="flight-step" style="--step: 2">
              <div>
                <p class="flights-pin__label">Departure · {{ date.format(new Date(flight.scheduled)) }}</p><time
                  :datetime="flight.scheduled">{{ time(flight.scheduled) }}</time><span
                  v-if="flight.estimated && !flight.cancelled"> → {{ time(flight.estimated) }}</span>
              </div>
              <div>
                <p class="flights-pin__label">Gate</p>
                <p>{{ flight.gate || 'Not assigned' }}</p>
              </div>
            </footer>
          </article>
        </Transition>
      </div>
      <div v-else class="flights-pin__empty">
        <p>{{ error ? 'Departures unavailable' : data ? 'No upcoming departures' : 'Checking departures…' }}</p><button
          v-if="error" type="button" @click="refresh">Try again</button>
      </div>
      <template v-if="flight && pageCount > 1">
        <button class="flights-pin__nav flights-pin__nav--previous" type="button" aria-label="Previous departure"
          @click="changeFlight(-1); navigationHaptic()" />
        <button class="flights-pin__nav flights-pin__nav--next" type="button" aria-label="Next departure"
          @click="changeFlight(1); navigationHaptic()" />
      </template>
    </div>
    <p v-if="error && data" class="flights-pin__notice" role="status">Update unavailable</p>
    <figcaption><span>Departures</span><a href="https://airport.by/en/raspisanie-rejsov/vylety" target="_blank"
        rel="noopener noreferrer">Minsk Airport ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.flights-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    container-type: inline-size;
    position: relative;
    aspect-ratio: 4 / 2.5;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #10181a;
    color: #daf759;
    font-family: var(--font-sans);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    letter-spacing: var(--flight-tracking);
  }

  &__board {
    position: absolute;
    inset: 0;
    display: grid;
    align-items: center;
  }

  &__slide {
    position: absolute;
    inset-inline: 5cqw;
    top: 50%;
    transform: translateY(-50%);
    overflow: hidden;
    border-radius: 7cqw;
    background: #daf759;
    color: #20221f;
  }

  p {
    margin: 0;
  }

  &__heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 3cqw;
    padding: 4cqw 4cqw 0;
    font-size: max(11px, 2.8cqw);
    line-height: 1.3;
  }

  &__status {
    text-align: right;
    max-width: 60%;
  }

  &__status.is-alert {
    text-decoration: underline;
    text-underline-offset: .2em;
  }

  &__route {
    display: grid;
    grid-template-columns: 1fr .9fr 1fr;
    align-items: start;
    gap: 2cqw;
    padding: 4cqw;
    min-height: 25cqw;
  }

  &__code {
    font-size: 10cqw;
    line-height: 1;
  }

  &__city {
    margin-top: 1cqw !important;
    min-height: 2.6em;
    font-size: max(11px, 2.8cqw);
    line-height: 1.3;
  }

  &__path {
    width: 100%;
    overflow: visible;
  }

  &__arrival {
    text-align: right;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  &__destination {
    font-size: 5.5cqw;
    line-height: 1.05;
    text-align: right;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }

  footer {
    display: flex;
    justify-content: space-between;
    gap: 3cqw;
    padding: 3cqw 4cqw 4cqw;
    background: rgb(32 34 31 / .07);
    font-size: max(12px, 3.5cqw);
    line-height: 1.4;
  }

  footer>div:last-child {
    text-align: right;
  }

  &__label {
    font-size: max(10px, 2.5cqw);
    margin-bottom: 1cqw !important;
  }

  &__empty {
    position: absolute;
    inset: 7cqw;
    display: grid;
    place-content: center;
    text-align: center;
    font-size: max(12px, 3.6cqw);
  }

  &__notice {
    padding: var(--space-2);
    font-size: var(--text-sm);
  }

  button:not(.flights-pin__nav) {
    font: inherit;
    color: inherit;
    border: 0;
    background: transparent;
    padding: .6em;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: .2em;
  }

  button:not(.flights-pin__nav):active {
    transform: scale(.96);
  }

  &__nav {
    appearance: none;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    width: 35%;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity var(--flight-hover) var(--ease-flow);
      pointer-events: none;
    }

    &--previous {
      left: 0;
    }

    &--next {
      right: 0;
    }

    &--previous::before {
      background: linear-gradient(to right, rgb(255 255 255 / .08), transparent);
    }

    &--next::before {
      background: linear-gradient(to left, rgb(255 255 255 / .08), transparent);
    }

    &:focus-visible {
      outline: 2px solid #f6eed9;
      outline-offset: -4px;
    }

    &:focus-visible::before,
    &:active::before {
      opacity: 1;
    }

    @media (hover: hover) {
      &:hover::before {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        transition: none;
      }
    }
  }

  figcaption {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  a {
    color: inherit;
    font-size: .75em;
    text-underline-offset: .2em;
  }
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

.flights-leave-active {
  pointer-events: none;
}

.flights-leave-active .flight-step {
  transition-duration: var(--flight-exit);
  transition-delay: calc(var(--step) * var(--flight-stagger) / 2);
}

.flights-enter-from .flight-step {
  opacity: 0;
  transform: translateY(var(--flight-travel));
}

.flights-leave-to .flight-step {
  opacity: 0;
  transform: translateY(calc(var(--flight-travel) / -2));
}

@media (prefers-reduced-motion: reduce) {

  .flights-enter-active .flight-step,
  .flights-leave-active .flight-step {
    transition: none;
  }

  .flights-enter-from .flight-step,
  .flights-leave-to .flight-step {
    transform: none;
  }
}
</style>
