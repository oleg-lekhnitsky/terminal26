<script setup lang="ts">
import { typographySystem } from '~/utils/textRenderer'
import type { ExchangeRate } from '~/utils/exchangeRate'

const host = useTemplateRef('host')
const { data, error, status, execute } = useFetch<ExchangeRate>('/api/usd-byn', {
  key: 'usd-byn-with-history', server: false, immediate: false,
  cache: 'no-store', getCachedData: () => undefined,
})
const chartRetryFailed = ref(false)
const rate = computed(() => data.value?.rate.toFixed(2))
const { activeFont } = useFontSelection()
const fittedRateSize = ref(24)
watch([rate, activeFont], async ([text, font], _, onCleanup) => {
  if (!import.meta.client || !text) return
  let cancelled = false
  onCleanup(() => { cancelled = true })
  const descriptor = `${font.style} ${font.weight} 100px "AB Terminal"`
  await document.fonts.load(descriptor, text)
  if (cancelled) return
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  context.font = descriptor
  context.fontKerning = 'normal'
  const metrics = context.measureText(text)
  const width = Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
  fittedRateSize.value = Math.min(36, 68 * 100 / width)
}, { immediate: true })
const chart = computed(() => {
  const points = data.value?.history
  if (!points || points.length < 2) return null
  const first = points[0]!
  const last = points[points.length - 1]!
  const low = Math.min(...points.map(point => point.rate))
  const high = Math.max(...points.map(point => point.rate))
  const spread = Math.max(high - low, low * .002)
  const floor = Math.max(0, low - spread * .2)
  const ceiling = high + spread * .2
  const start = Date.parse(data.value!.date) - 29 * 86400000
  const pixels = points.flatMap(point => {
    const column = Math.round((Date.parse(point.date) - start) / 86400000)
    const height = Math.round(3 + (point.rate - floor) / (ceiling - floor) * 14)
    return Array.from({ length: height + 2 }, (_, row) => ({
      x: column * 10, y: (19 - row) * 10,
      opacity: row < height ? 1 : row === height ? .35 : .15,
    }))
  })
  const change = (last.rate / first.rate - 1) * 100
  return { pixels, first, last, low, high, change: `${change > 0 ? '+' : ''}${change.toFixed(2)}%` }
})
let observer: IntersectionObserver | undefined
let timer: ReturnType<typeof setInterval> | undefined
let visible = false
let lastRefresh = 0
let disposed = false
async function refresh() {
  if (status.value === 'pending') return
  chartRetryFailed.value = false
  await execute()
  chartRetryFailed.value = !chart.value
  if (!disposed) lastRefresh = error.value ? 0 : Date.now()
}
function sync() {
  clearInterval(timer)
  if (disposed || !visible || document.hidden) return
  const refreshIfNeeded = () => {
    const interval = chart.value ? 600000 : 30000
    if (Date.now() - lastRefresh > interval) void refresh()
  }
  refreshIfNeeded()
  timer = setInterval(refreshIfNeeded, 30000)
}
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    sync()
  })
  if (host.value) observer.observe(host.value)
  document.addEventListener('visibilitychange', sync)
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(timer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="exchange-pin" :style="{ '--exchange-tracking': `${typographySystem.letterSpacing}em` }">
    <div class="exchange-pin__art" :class="{ 'has-chart': chart }">
      <template v-if="data">
        <p class="exchange-pin__from">1 USD</p>
        <div v-if="chart" class="exchange-pin__trend"><span>{{ chart.change }}</span><span>30 days</span></div>
        <div class="exchange-pin__reading">
          <p class="exchange-pin__rate" :style="{ fontSize: `${chart ? fittedRateSize : Math.min(24, 130 / (rate?.length || 6))}cqw` }">{{ rate
            }}</p>
          <p class="exchange-pin__currency">BYN</p>
        </div>
        <div v-if="chart" class="exchange-pin__chart">
          <svg viewBox="0 0 298 198" role="img" :aria-label="`USD to BYN from ${chart.first.date} to ${chart.last.date}. Change ${chart.change}. Range ${chart.low.toFixed(4)} to ${chart.high.toFixed(4)} BYN. Chart uses a cropped vertical scale.`">
            <rect v-for="pixel in chart.pixels" :key="`${pixel.x}-${pixel.y}`" :x="pixel.x" :y="pixel.y" width="7" height="7" rx="1" fill="currentColor" :opacity="pixel.opacity" />
          </svg>
          <p class="exchange-pin__range">{{ chart.low.toFixed(4) }}–{{ chart.high.toFixed(4) }} BYN · range</p>
        </div>
        <div v-else class="exchange-pin__history-note">
          <p v-if="chartRetryFailed" role="status">Couldn’t load chart data.</p>
          <button type="button" :disabled="status === 'pending'" @click="refresh">{{ status === 'pending' ? 'Loading chart…' : 'Retry chart' }}</button>
        </div>
      </template>
      <div v-else class="exchange-pin__empty">
        <p>{{ error ? 'Rate unavailable' : 'Checking the rate…' }}</p>
        <button v-if="error" type="button" :disabled="status === 'pending'" @click="refresh">Try again</button>
      </div>
    </div>
    <figcaption><span>Exchange rate</span><a href="https://www.nbrb.by/statistics/rates/ratesdaily" target="_blank"
        rel="noopener noreferrer">NBRB ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.exchange-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    position: relative;
    container-type: inline-size;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #026b2c;
    color: #daf759;
    text-align: center;
    font-family: var(--font-sans);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    letter-spacing: var(--exchange-tracking);
  }

  p {
    margin: 0;
  }

  &__from {
    position: absolute;
    top: 7cqw;
    inset-inline: 5cqw;
    font-size: 8cqw;
    line-height: 1.1;
  }

  &__reading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4cqw;
  }

  &__rate {
    line-height: 1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-kerning: normal;
  }

  &__art.has-chart {
    .exchange-pin__from { top: 7cqw; font-size: 5cqw; text-align: center; inset-inline: 7cqw; }
    .exchange-pin__reading { inset: auto 7cqw 8cqw; flex-direction: row; justify-content: space-between; align-items: baseline; gap: 2cqw; }
    .exchange-pin__currency { font-size: 5cqw; }
  }
  &__chart { position: absolute; top: 20cqw; inset-inline: 7cqw; text-align: left; }
  &__trend { position: absolute; top: 7cqw; inset-inline: 7cqw; display: flex; justify-content: space-between; align-items: center; min-height: 5.5cqw; font-size: max(11px, 3.5cqw); line-height: 1.4; }
  &__chart svg { display: block; width: 100%; }
  &__range { font-size: max(9px, 2.5cqw); line-height: 1.4; opacity: .75; margin-top: 2cqw !important; }
  &__history-note { position: absolute; inset-inline: 5cqw; bottom: 15cqw; font-size: 3cqw; opacity: .75; }

  &__currency {
    font-size: 8cqw;
    line-height: 1;
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    gap: var(--space-3);
    font-size: 4cqw;
  }

  button {
    font: inherit;
    color: inherit;
    padding: .5em 1em;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
  }

  button:active {
    transform: scale(.96);
  }

  button:disabled {
    opacity: .5;
    cursor: wait;
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
</style>
