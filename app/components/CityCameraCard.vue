<script setup lang="ts">
import type Hls from 'hls.js'
import { motionSystem, typographySystem } from '~/utils/textRenderer'

const cities = [
  { type: 'image', name: 'Grindelwald', location: 'Glecksteinhütte · West view', country: 'Switzerland', source: 'https://opencctv.org/cameras/switzerland/bern/grindelwald/glecksteinhutte-blick-nach-westen-102988', credit: 'Foto-Webcam', stream: 'https://www.foto-webcam.eu/webcam/glecksteinhuette/current/1200.jpg' },
  { type: 'image', name: 'Copiapó', location: 'Desierto de Atacama · South view', country: 'Chile', source: 'https://opencctv.org/cam/124367', credit: 'DGAC Chile', stream: '/api/atacama-camera' },
  { type: 'video', name: 'Seoul', location: 'Seoul National University Station', country: 'South Korea', source: 'https://opencctv.org/cameras/south-korea/seoul/seoul-national-university-station-121764', credit: 'Seoul TOPIS', stream: 'https://topiscctv1.eseoul.go.kr/sd2/ch11.stream/playlist.m3u8' },
  { type: 'video', name: 'New York', location: 'Times Square South', country: 'United States', source: 'https://opencctv.org/cameras/united-states/new-york/new-york-city/times-square-south-4k-127051', credit: 'EarthCam', stream: 'https://videos-3.earthcam.com/fecnetwork/28925.flv/playlist.m3u8' },
  { type: 'image', name: 'Berestovitsa', location: 'Border crossing · Entry', country: 'Belarus', source: 'https://opencctv.org/cameras/belarus/berestovitsa/berestovitsa-entry-97320', credit: 'Belarus Customs', stream: 'https://www.customs.gov.by/webcam/gr05.jpg' },
] as const
const cityIndex = ref(0)
const city = computed(() => cities[cityIndex.value]!)
const cityDuration = motionSystem.enter * 30 * 1000
let cityTimer: ReturnType<typeof setTimeout> | undefined
let loadingTimer: ReturnType<typeof setTimeout> | undefined
let switching = false
const imageVersion = ref(0)
const imageSrc = ref('')
let imageTimer: ReturnType<typeof setTimeout> | undefined
const host = useTemplateRef('host')
const video = useTemplateRef('video')
const status = ref(`Connecting to ${city.value.name}…`)
const needsPlay = ref(false)
let player: Hls | undefined
let observer: IntersectionObserver | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
let visible = false
let disposed = false
let generation = 0

function stop() {
  generation++
  clearTimeout(retryTimer)
  clearTimeout(cityTimer)
  clearTimeout(loadingTimer)
  clearTimeout(imageTimer)
  imageSrc.value = ''
  cityTimer = undefined
  player?.destroy()
  player = undefined
  const media = video.value
  if (media) {
    media.pause()
    media.removeAttribute('src')
    media.load()
  }
}
async function play() {
  const media = video.value
  if (!media || disposed || !visible || document.hidden) return
  try {
    media.muted = true
    await media.play()
    needsPlay.value = false
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      clearTimeout(loadingTimer)
      needsPlay.value = true
      status.value = 'Tap to play the live camera'
    }
  }
}
async function nextCity(direction = 1) {
  if (disposed || !visible || document.hidden || switching) return
  switching = true
  stop()
  cityIndex.value = (cityIndex.value + direction + cities.length) % cities.length
  await nextTick()
  switching = false
  void start()
}
function retry() {
  if (disposed || !visible || document.hidden || switching) return
  stop()
  needsPlay.value = false
  status.value = `${city.value.name} unavailable · Trying next city…`
  retryTimer = setTimeout(() => void nextCity(), 4000)
}
async function start() {
  stop()
  if (disposed || !visible || document.hidden) return
  const token = generation
  const streamUrl = city.value.stream
  loadingTimer = setTimeout(retry, 20000)
  status.value = `Connecting to ${city.value.name}…`
  needsPlay.value = false
  if (city.value.type === 'image') {
    refreshImage()
    return
  }
  const media = video.value
  if (!media) return
  if (media.canPlayType('application/vnd.apple.mpegurl')) {
    media.src = streamUrl
    void play()
    return
  }
  try {
    const { default: Hls } = await import('hls.js')
    if (disposed || token !== generation) return
    if (!Hls.isSupported()) {
      clearTimeout(loadingTimer)
      status.value = 'Live video is not supported in this browser'
      return
    }
    player = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 15, backBufferLength: 0 })
    player.on(Hls.Events.MANIFEST_PARSED, () => void play())
    player.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) retry() })
    player.loadSource(streamUrl)
    player.attachMedia(media)
  } catch {
    if (token === generation) retry()
  }
}
function syncPlayback() {
  if (visible && !document.hidden) void start()
  else {
    stop()
    status.value = 'Camera paused'
  }
}
function refreshImage() {
  if (disposed || !visible || document.hidden || city.value.type !== 'image') return
  imageVersion.value = Date.now()
  imageSrc.value = `${city.value.stream}?t=${imageVersion.value}`
}
function onImageLoaded() {
  if (disposed || !visible || document.hidden || city.value.type !== 'image') return
  onPlaying()
  clearTimeout(imageTimer)
  imageTimer = setTimeout(refreshImage, 10000)
}
function onPlaying() {
  clearTimeout(loadingTimer)
  status.value = `${city.value.name} · ${city.value.type === 'image' ? 'Camera snapshot' : 'Live camera'}`
  if (!cityTimer) cityTimer = setTimeout(() => void nextCity(), cityDuration)
  needsPlay.value = false
}
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    const next = entry?.isIntersecting ?? false
    if (next === visible) return
    visible = next
    syncPlayback()
  })
  if (host.value) observer.observe(host.value)
  document.addEventListener('visibilitychange', syncPlayback)
})
onBeforeUnmount(() => {
  disposed = true
  stop()
  observer?.disconnect()
  document.removeEventListener('visibilitychange', syncPlayback)
})
</script>

<template>
  <figure ref="host" class="camera-pin" :style="{ '--camera-tracking': `${typographySystem.letterSpacing}em`, '--camera-hover': `${motionSystem.rest}s` }">
    <div class="camera-pin__art">
      <img v-if="city.type === 'image' && imageSrc" class="camera-pin__image" :src="imageSrc" :alt="`${city.name} entry camera snapshot`" @load="onImageLoaded" @error="retry">
      <video v-if="city.type === 'video'" :key="city.name" ref="video" class="camera-pin__image" muted autoplay playsinline preload="none"
        :aria-label="`Live camera in ${city.name}`"
        @playing="onPlaying" @error="retry"
        @waiting="status = `${city.name} · Buffering…`" />
      <div class="camera-pin__scrim" />
      <p class="camera-pin__status">{{ status }}</p>
      <div class="camera-pin__type" :style="{ fontSize: `${Math.min(28, 110 / city.name.length)}cqw` }">{{ city.name }}</div>
      <button v-if="needsPlay" class="camera-pin__play" type="button" @click="play">Play live camera</button>
      <div class="camera-pin__location">{{ city.location }}<br>{{ city.country }}</div>
      <button class="camera-pin__nav camera-pin__nav--previous" type="button" aria-label="Previous camera" @click="nextCity(-1)" />
      <button class="camera-pin__nav camera-pin__nav--next" type="button" aria-label="Next camera" @click="nextCity(1)" />
    </div>
    <figcaption><span>Street type</span><a :href="city.source" target="_blank" rel="noopener noreferrer">{{ city.credit }} ↗</a></figcaption>
  </figure>
</template>

<style scoped lang="scss">
.camera-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;
  &__art { position: relative; container-type: inline-size; aspect-ratio: 4 / 5; overflow: hidden; isolation: isolate; border-radius: var(--radius-xl); background: #213735; color: #f4f3dc; }
  &__image, &__scrim { position: absolute; inset: 0; width: 100%; height: 100%; }
  &__image { object-fit: cover; }
  &__scrim { background: linear-gradient(180deg, rgb(0 0 0 / 0.45), transparent 25% 65%, rgb(0 0 0 / 0.65)); pointer-events: none; }
  &__status { position: absolute; top: 5cqw; left: 5cqw; right: 5cqw; margin: 0; font-size: 2.7cqw; line-height: 1.4; text-align: center; }
  &__type {
    position: absolute; inset: 0; display: grid; place-content: center;
    font-family: var(--font-sans); font-weight: var(--specimen-weight, 700); font-style: var(--specimen-style, normal);
    font-size: 19cqw; line-height: 0.95; letter-spacing: var(--camera-tracking); text-align: center;
    color: #f1ffbb; pointer-events: none;
  }
  &__play { position: absolute; z-index: 3; bottom: 13cqw; left: 50%; transform: translateX(-50%); border: 0; border-radius: 999px; padding: 0.75em 1em; background: #f1ffbb; color: #213735; font: inherit; cursor: pointer; }
  &__nav {
    position: absolute; z-index: 2; top: 0; bottom: 0; width: 35%;
    border: 0; padding: 0; background: transparent; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    &::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity var(--camera-hover) var(--ease-flow); pointer-events: none; }
    &--previous { left: 0; }
    &--next { right: 0; }
    &--previous::before { background: linear-gradient(to right, rgb(0 0 0 / .25), transparent); }
    &--next::before { background: linear-gradient(to left, rgb(0 0 0 / .25), transparent); }
    &:focus-visible { outline: 2px solid #f1ffbb; outline-offset: -4px; }
    &:focus-visible::before, &:active::before { opacity: 1; }
    @media (hover: hover) { &:hover::before { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { &::before { transition: none; } }
  }
  &__location { position: absolute; bottom: 5cqw; left: 5cqw; right: 5cqw; font-size: 3cqw; line-height: 1.3; text-align: center; }
  figcaption { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2); padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-text); }
  a { color: inherit; font-size: 0.75em; text-underline-offset: 0.2em; }
}
</style>
