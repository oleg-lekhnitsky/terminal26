<script setup lang="ts">
import type { RadioStation } from '~/utils/arabicRadio'
const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const stations = ref<RadioStation[]>([])
const index = ref(0)
const station = computed(() => stations.value[index.value])
const loading = ref(true)
const state = ref<'idle' | 'buffering' | 'playing' | 'error'>('idle')
const message = ref('')
const volume = ref(.7)
const visible = ref(false)
const tabVisible = ref(true)
let audio: HTMLAudioElement | undefined
let deadline: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined
let disposed = false
async function loadStations() {
  loading.value = true
  message.value = ''
  try {
    const result = await $fetch('/api/arabic-radio')
    if (disposed) return
    stations.value = [...result.stations].sort((a, b) => Number(/Radio Hits/i.test(b.name)) - Number(/Radio Hits/i.test(a.name)))
    if (!stations.value.length) message.value = 'No stations available. Try again.'
  } catch { if (!disposed) message.value = 'Could not load stations. Try again.' }
  finally { if (!disposed) loading.value = false }
}
function stop() {
  clearTimeout(deadline)
  if (audio) {
    audio.onplaying = audio.onwaiting = audio.onerror = audio.onended = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audio = undefined
  }
  state.value = 'idle'
}
function failed() {
  stop()
  state.value = 'error'
  message.value = 'Station unavailable. Try another station.'
}
async function play() {
  if (!station.value) return
  stop()
  message.value = ''
  state.value = 'buffering'
  const player = new Audio()
  audio = player
  player.preload = 'none'
  player.volume = volume.value
  player.src = station.value.url
  const armTimeout = () => {
    clearTimeout(deadline)
    deadline = setTimeout(() => { if (audio === player) failed() }, 15000)
  }
  player.onplaying = () => { if (audio === player) { clearTimeout(deadline); state.value = 'playing' } }
  player.onwaiting = () => { if (audio === player) { state.value = 'buffering'; armTimeout() } }
  player.onerror = player.onended = () => { if (audio === player) failed() }
  armTimeout()
  try { await player.play() }
  catch { if (audio === player) failed() }
}
function toggle() { if (state.value === 'playing' || state.value === 'buffering') stop(); else void play() }
function select(next: number) {
  const resume = state.value === 'playing' || state.value === 'buffering'
  stop()
  message.value = ''
  index.value = (next + stations.value.length) % stations.value.length
  if (resume) void play()
}
function choose(event: Event) { select(Number((event.target as HTMLSelectElement).value)) }
watch(volume, value => { if (audio) audio.volume = value })
function visibility() { tabVisible.value = !document.hidden }
onMounted(() => {
  void loadStations()
  visibility()
  document.addEventListener('visibilitychange', visibility)
  observer = new IntersectionObserver(([entry]) => { visible.value = entry?.isIntersecting ?? false })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => { disposed = true; stop(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility) })
</script>

<template>
  <figure ref="host" class="radio-pin">
    <div class="radio-pin__art" :style="{ fontWeight: activeFont.weight, fontStyle: activeFont.style }">
      <header class="radio-pin__header"><span>TERMINAL / RADIO</span><span>{{ state === 'playing' ? 'ON AIR' : 'FM / 01' }}</span></header>
      <div class="radio-case" aria-hidden="true">
        <div class="radio-case__hinge" />
        <div class="radio-case__disc" :class="{ 'is-playing': state === 'playing' && visible && tabVisible }">
          <div class="radio-case__etch">ARABIC AIRWAVES<br>STEREO / LIVE</div>
          <div class="radio-case__title">Terminal<span>{{ activeFont.label }}</span></div>
        </div>
        <div class="radio-case__hub" />
        <span class="radio-case__code">R%—02<br>CD / 001</span>
        <span class="radio-case__corner">AB<br>TERMINAL</span>
      </div>
      <div class="radio-pin__tuning">
        <label class="sr-only" for="terminal-radio-station">Radio station</label>
        <div v-if="stations.length" class="radio-pin__station">
          <span aria-hidden="true">{{ station?.name }} · {{ station?.country }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          <select id="terminal-radio-station" :value="index" @change="choose">
            <option v-for="(item, i) in stations" :key="item.id" :value="i">{{ item.name }} · {{ item.country }}</option>
          </select>
        </div>
        <span v-else>{{ loading ? 'Finding stations…' : 'Radio unavailable' }}</span>
        <p role="status">{{ message || (state === 'buffering' ? 'Tuning in…' : state === 'playing' ? `${station?.country} / Live radio` : 'Choose a station. Press play.') }}</p>
      </div>
      <div class="radio-pin__controls">
        <button type="button" aria-label="Previous radio station" :disabled="!stations.length" @click="select(index - 1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 5 8 12l10 7Z" /></svg></button>
        <button class="radio-pin__play" type="button" :aria-label="state === 'playing' || state === 'buffering' ? 'Stop radio' : 'Play radio'" :disabled="!stations.length" @click="toggle">
          <svg v-if="state === 'playing' || state === 'buffering'" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7ZM14 5h3v14h-3Z" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
        </button>
        <button type="button" aria-label="Next radio station" :disabled="!stations.length" @click="select(index + 1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 5l10 7-10 7Z" /></svg></button>
      </div>
      <label class="radio-pin__volume"><span>VOL</span><input v-model.number="volume" type="range" min="0" max="1" step=".05" aria-label="Radio volume"><span>{{ Math.round(volume * 100) }}</span></label>
      <button v-if="!loading && !stations.length" class="radio-pin__retry" type="button" @click="loadStations">Retry stations</button>
    </div>
    <figcaption><span>Radio disc</span><a href="https://www.radio-browser.info/" target="_blank" rel="noopener noreferrer">Radio Browser ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.radio-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { container-type: inline-size; position: relative; overflow: hidden; border-radius: var(--radius-xl); padding: 7% 7% 6%; background: #e9eae6; color: #222722; font-family: var(--font-sans); }
  &__header { display: flex; justify-content: space-between; font-size: 2.5cqw; font-weight: 400; font-style: normal; }
  &__tuning { margin-top: 6cqw; text-align: center; }
  &__station { position: relative; display: grid; place-items: center; min-height: 44px; font-size: 3.6cqw; }
  &__station > span { display: block; width: 100%; padding-inline: 28px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
  &__station > svg { position: absolute; right: 4px; top: calc(50% - 9px); width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; pointer-events: none; }
  &__station select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; appearance: none; -webkit-appearance: none; cursor: pointer; font-size: 16px; }
  &__station:focus-within { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 4px; }
  &__tuning p { min-height: 2.5em; margin: .5em 0 0; font-size: 2.6cqw; line-height: 1.3; font-weight: 400; font-style: normal; }
  &__controls { display: grid; grid-template-columns: 44px max(44px, 14cqw) 44px; justify-content: center; align-items: center; justify-items: center; gap: 4cqw; }
  button { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; padding: 0; display: grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; background: transparent; color: inherit; cursor: pointer; }
  button:disabled { opacity: .4; cursor: default; }
  button:active:not(:disabled) { transform: scale(.96); }
  button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  button svg { width: 22px; height: 22px; fill: currentColor; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
  &__play { width: 14cqw; height: 14cqw; background: #222722 !important; color: #f3f3eb !important; border-radius: 50%; }
  &__volume { display: grid; grid-template-columns: 3ch 38% 3ch; align-items: center; justify-content: center; gap: 3cqw; margin: 4cqw auto 0; font-size: 2.5cqw; font-style: normal; font-weight: 400; }
  &__volume input { width: 100%; margin: 0; min-width: 0; accent-color: #485b50; height: 24px; cursor: pointer; }
  &__volume > span:first-child { text-align: right; }
  &__volume > span:last-child { text-align: left; font-variant-numeric: tabular-nums; }
  &__retry { margin: .5rem auto 0; font: inherit; text-decoration: underline; }
  figcaption { display: flex; justify-content: space-between; gap: 1rem; padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
  figcaption a { color: inherit; font-size: .75em; }
}
.radio-case {
  position: relative; width: 94%; aspect-ratio: 1; margin: 7cqw auto 0; border: 1px solid #aeb5af; border-radius: 3px; background: linear-gradient(130deg, #fff8, #d0d9d644 45%, #fff8); box-shadow: inset 0 0 0 3px #f7f7ed, inset 0 0 0 5px #b4bcb377, 0 6px 8px #22272220;
  &::before, &::after { content: ''; position: absolute; inset: 3% 3% auto; height: 12%; border: 1px solid #aeb5af77; border-radius: 2px; box-shadow: inset 0 0 0 2px #fff8; }
  &::after { top: auto; bottom: 3%; }
  &__hinge { position: absolute; inset: 0 auto 0 3%; width: 6%; border-inline: 1px solid #aeb5af88; }
  &__disc { position: absolute; inset: 3%; border-radius: 50%; border: 1px solid #8e9e99; background: radial-gradient(circle, transparent 29%, #fff5 30%, transparent 31%, #fff4 67%, #c0ccca 68%, #fff 69%, #879997 70%, transparent 71%), conic-gradient(from 20deg, #d6dedd, #f4ded9 10%, #f5f0bd 19%, #cceade 25%, #c4dae7 31%, #dedde3 40%, #f0f0e8 49%, #dccfe8 56%, #cee6e8 66%, #f0e6c7 74%, #dce7dd 82%, #adbfbf 90%, #d6dedd); box-shadow: 0 1px 3px #273d3955, inset 0 0 0 3px #ffffff70; animation: radio-spin 16s linear infinite; animation-play-state: paused; }
  &__disc.is-playing { animation-play-state: running; }
  &__hub { position: absolute; inset: 34%; border: 1.5cqw solid #1a1f20; border-radius: 50%; background: radial-gradient(circle, #e9eae6 0 44%, #bec8c5 46% 52%, #4b5451 54% 58%, #15191b 60%); box-shadow: 0 0 0 3px #8fa8aa, 0 0 0 5px #d6e1da; }
  &__etch { position: absolute; top: 12%; width: 100%; text-align: center; font-size: 2cqw; line-height: 1.25; font-weight: 400; font-style: normal; }
  &__title { position: absolute; top: 72%; width: 100%; text-align: center; font-size: 6.5cqw; line-height: 1; }
  &__title span { display: block; margin-top: .4em; font-size: 2.3cqw; }
  &__code { position: absolute; left: 8%; top: 34%; font-size: 1.8cqw; line-height: 1.4; font-weight: 400; font-style: normal; }
  &__corner { position: absolute; right: 6%; bottom: 5%; font-size: 1.6cqw; text-align: right; font-weight: 400; font-style: normal; }
}
@keyframes radio-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .radio-case__disc { animation: none; } }
</style>
