<script setup lang="ts">
import { typographySystem } from '~/utils/textRenderer'
import type { ExchangeRate } from '~/utils/exchangeRate'

const host = useTemplateRef('host')
const { data, error, status, execute } = useFetch<ExchangeRate>('/api/usd-byn', { server: false, immediate: false })
const rate = computed(() => data.value?.rate.toFixed(2))
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
function sync() {
  clearInterval(timer)
  if (disposed || !visible || document.hidden) return
  if (Date.now() - lastRefresh > 600000) void refresh()
  timer = setInterval(() => { void refresh() }, 600000)
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
    <div class="exchange-pin__art">
      <template v-if="data">
        <p class="exchange-pin__from">1 USD</p>
        <div class="exchange-pin__reading">
          <p class="exchange-pin__rate" :style="{ fontSize: `${Math.min(24, 130 / (rate?.length || 6))}cqw` }">{{ rate
            }}</p>
          <p class="exchange-pin__currency">BYN</p>
        </div>
        <div class="exchange-pin__details">
          <p>Official rate · <time :datetime="data.date">{{ data.date }}</time></p>
          <button v-if="error" type="button" :disabled="status === 'pending'" @click="refresh">Retry update</button>
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
    background: #03963e;
    color: #b10f76;
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
  }

  &__currency {
    font-size: 8cqw;
    line-height: 1;
  }

  &__details {
    position: absolute;
    bottom: 7cqw;
    inset-inline: 5cqw;
    font-size: 3cqw;
    line-height: 1.65;
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
