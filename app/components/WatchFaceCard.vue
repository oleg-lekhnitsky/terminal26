<script setup lang="ts">
const id = useId()
const { activeFont } = useFontSelection()
const measure = useTemplateRef('measure')
const digitSize = ref(137)
let fontRequest = 0
const host = useTemplateRef('host')
const hours = ref('07')
const minutes = ref('32')
const seconds = ref(0)
const timeLabel = ref('Watch face')
let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let visible = false

async function fitDigits() {
  const request = ++fontRequest
  await nextTick()
  if (!measure.value) return
  const style = getComputedStyle(measure.value)
  try {
    await document.fonts.load(`${style.fontStyle} ${style.fontWeight} 137px ${style.fontFamily}`, '0123456789')
  } catch { /* Measure the available fallback font. */ }
  if (request !== fontRequest || !measure.value) return
  // Fit the widest pair once per font so time changes never resize the digits.
  const widest = Math.max(...Array.from({ length: 10 }, (_, i) => measure.value!.getSubStringLength(i, 1)))
  digitSize.value = widest > 0 ? Math.min(137, 137 * 213 / (widest * 2)) : 137
}
watch(activeFont, fitDigits, { flush: 'post' })

function update() {
  clearTimeout(timer)
  if (!visible || document.hidden) return
  const now = new Date()
  hours.value = String(now.getHours()).padStart(2, '0')
  minutes.value = String(now.getMinutes()).padStart(2, '0')
  seconds.value = motion?.matches ? 0 : now.getSeconds()
  timeLabel.value = `Watch face, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  timer = setTimeout(update, motion?.matches
    ? (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    : 1000 - now.getMilliseconds())
}

onMounted(() => {
  void fitDigits()
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', update)
  document.addEventListener('visibilitychange', update)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    update()
  })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => {
  fontRequest++
  clearTimeout(timer)
  observer?.disconnect()
  motion?.removeEventListener('change', update)
  document.removeEventListener('visibilitychange', update)
})
</script>

<template>
  <figure ref="host" class="watch-pin">
    <div class="watch-pin__art" role="img" :aria-label="timeLabel">
      <svg viewBox="0 0 400 500" aria-hidden="true" class="watch" :style="{ '--watch-digit-size': `${digitSize}px` }">
        <defs>
          <linearGradient :id="`${id}-strap`" x1="0" x2="1">
            <stop stop-color="#171819" />
            <stop offset=".06" stop-color="#262729" />
            <stop offset=".2" stop-color="#292a2b" />
            <stop offset=".5" stop-color="#242526" />
            <stop offset=".8" stop-color="#222324" />
            <stop offset=".94" stop-color="#1e1f20" />
            <stop offset="1" stop-color="#141516" />
          </linearGradient>
          <linearGradient :id="`${id}-case`" x1="0" y1="0" x2="1" y2=".25">
            <stop stop-color="#131416" />
            <stop offset=".08" stop-color="#65676b" />
            <stop offset=".15" stop-color="#222427" />
            <stop offset=".45" stop-color="#08090a" />
            <stop offset=".85" stop-color="#101113" />
            <stop offset=".96" stop-color="#45474b" />
            <stop offset="1" stop-color="#151618" />
          </linearGradient>
          <linearGradient :id="`${id}-glass-top`" x1="0" y1="0" x2=".12" y2="1">
            <stop stop-color="#f1f2f4" stop-opacity=".62" />
            <stop offset=".22" stop-color="#c2c5ca" stop-opacity=".36" />
            <stop offset=".6" stop-color="#71757c" stop-opacity=".12" />
            <stop offset="1" stop-color="#33363b" stop-opacity="0" />
          </linearGradient>
          <linearGradient :id="`${id}-glass-bottom`" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#6d727a" stop-opacity="0" />
            <stop offset=".7" stop-color="#92979e" stop-opacity=".12" />
            <stop offset="1" stop-color="#d6d8dd" stop-opacity=".26" />
          </linearGradient>
          <radialGradient :id="`${id}-glass-side`" cx=".4" cy=".26" r=".8">
            <stop stop-color="#f5f6f8" stop-opacity=".38" />
            <stop offset=".24" stop-color="#c7cbd0" stop-opacity=".19" />
            <stop offset=".65" stop-color="#7d838c" stop-opacity=".06" />
            <stop offset="1" stop-color="#7d838c" stop-opacity="0" />
          </radialGradient>
          <linearGradient :id="`${id}-edge`" x1="0" y1="0" x2="1" y2=".65">
            <stop stop-color="#fff" stop-opacity="0" />
            <stop offset=".2" stop-color="#fff" stop-opacity=".65" />
            <stop offset=".43" stop-color="#d4d6db" stop-opacity=".22" />
            <stop offset=".72" stop-color="#fff" stop-opacity="0" />
            <stop offset="1" stop-color="#d4d6db" stop-opacity=".14" />
          </linearGradient>
          <linearGradient :id="`${id}-reflection-fade`" x1="0" y1="0" x2="1" y2="0">
            <stop stop-color="#fff" stop-opacity="0" />
            <stop offset=".18" stop-color="#fff" stop-opacity=".45" />
            <stop offset=".38" stop-color="#fff" stop-opacity="1" />
            <stop offset=".62" stop-color="#fff" stop-opacity=".8" />
            <stop offset=".83" stop-color="#fff" stop-opacity=".3" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          <mask :id="`${id}-reflection-mask`" maskUnits="userSpaceOnUse" x="65" y="98" width="270" height="310">
            <rect x="65" y="98" width="270" height="310" :fill="`url(#${id}-reflection-fade)`" />
          </mask>
          <filter :id="`${id}-reflection-softness`" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation=".65" />
          </filter>
          <linearGradient :id="`${id}-crown`" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#111214" />
            <stop offset=".4" stop-color="#55575a" />
            <stop offset="1" stop-color="#0a0b0d" />
          </linearGradient>
        </defs>
        <g class="watch__body">
          <!-- Broad, curved shoulders tuck beneath the case; soft shading models the rubber edges. -->
          <path d="M130 -20 H270 C270 34 272 66 287 90 Q293 102 304 114 H96 Q107 102 113 90 C128 66 130 34 130 -20 Z" :fill="`url(#${id}-strap)`" />
          <path d="M96 390 H304 Q293 402 287 414 C272 438 270 470 270 524 H130 C130 470 128 438 113 414 Q107 402 96 390 Z" :fill="`url(#${id}-strap)`" />
          <rect x="329" y="172" width="18" height="43" rx="7" :fill="`url(#${id}-crown)`" />
          <path v-for="ridge in 7" :key="ridge" :d="`M${331 + ridge * 1.8} 179 V208`" stroke="#08090a" stroke-width=".8" />
          <rect x="333" y="249" width="6" height="49" rx="3" fill="#292b2e" />
          <rect x="62" y="94" width="276" height="316" rx="67" :fill="`url(#${id}-case)`" />
          <!-- The rolled glass has broad, tapered reflections, not concentric outlines. -->
          <rect x="66" y="98" width="268" height="308" rx="64" fill="#030405" />
          <rect x="74" y="109" width="252" height="286" rx="55" fill="#000" />
          <g :filter="`url(#${id}-reflection-softness)`">
            <path d="M81 138 C88 111 104 102 139 102 H262 C290 102 309 112 318 137 C302 116 284 110 260 110 H140 C113 110 94 118 81 138 Z" :fill="`url(#${id}-glass-top)`" :mask="`url(#${id}-reflection-mask)`" />
            <path d="M81 368 C95 392 112 398 142 398 H258 C288 398 305 391 319 367 C311 392 290 402 259 402 H141 C109 402 90 393 81 368 Z" :fill="`url(#${id}-glass-bottom)`" :mask="`url(#${id}-reflection-mask)`" />
            <path d="M91 123 C75 145 71 164 71 202 V311 C71 343 74 359 84 375 C77 350 78 332 78 304 V201 C78 167 80 145 91 123 Z" :fill="`url(#${id}-glass-side)`" />
            <path d="M308 125 C325 144 329 165 329 202 V309 C329 344 325 361 316 376 C324 344 322 324 322 302 V200 C322 165 319 146 308 125 Z" :fill="`url(#${id}-glass-side)`" opacity=".6" />
          </g>
          <path d="M72 161 C72 120 94 101 133 101 H266 C305 101 328 122 328 163" fill="none" :stroke="`url(#${id}-edge)`" stroke-width=".8" />
          <text ref="measure" class="watch__digits" visibility="hidden" style="font-size: 137px">0123456789</text>
          <text x="200" y="242" text-anchor="middle" class="watch__digits watch__digits--hours">{{ hours }}</text>
          <text x="200" y="362" text-anchor="middle" class="watch__digits watch__digits--minutes">{{ minutes }}</text>
          <g :transform="`rotate(${seconds * 6} 200 252)`">
            <path d="M200 268 V135" stroke="#fa201c" stroke-width="2.3" />
            <circle cx="200" cy="252" r="7" fill="#fa201c" />
            <circle cx="200" cy="252" r="2.7" fill="#000" />
          </g>
        </g>
      </svg>
    </div>
    <figcaption>Watch face</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.watch-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background:
      radial-gradient(ellipse at 24% 18%, #36373955, transparent 55%),
      repeating-radial-gradient(ellipse at 110% 110%, #ffffff03 0 1px, transparent 1px 4px),
      #191a1c;
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}

.watch {
  display: block;
  width: 100%;
  height: 100%;

  &__body { filter: drop-shadow(0 12px 12px #0009); }
  &__digits {
    font-family: var(--font-sans);
    font-size: var(--watch-digit-size, 137px);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    font-variant-numeric: tabular-nums;
    &--hours { fill: #dddde0; }
    &--minutes { fill: #d477d5; }
  }
}
</style>
