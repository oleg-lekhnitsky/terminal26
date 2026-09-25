<script setup lang="ts">
const { activeFont } = useFontSelection()
const id = useId()
const menu = useTemplateRef('menu')
const host = useTemplateRef('host')
const highlighted = ref(3)
let timer: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let visible = false

function syncHighlight() {
  clearInterval(timer)
  if (!visible || document.hidden || motion?.matches) return
  timer = setInterval(() => {
    highlighted.value = (highlighted.value + 1) % labels.length
  }, 1200)
}
const fontSize = ref(40)
const labels = ['About font', 'Type tester', 'Glyphs', 'Styles', 'Stylistic sets', 'Languages']
let fontRequest = 0

async function fitLabels() {
  const request = ++fontRequest
  await nextTick()
  const first = menu.value?.querySelector('text')
  if (!first) return
  const style = getComputedStyle(first)
  try {
    await document.fonts.load(`${style.fontStyle} ${style.fontWeight} 40px ${style.fontFamily}`, labels.join(' '))
  } catch { /* Fit the available fallback font. */ }
  if (request !== fontRequest || !menu.value) return
  const texts = Array.from(menu.value.querySelectorAll('text'))
  const widest = Math.max(...texts.map(text => text.getComputedTextLength()), 1)
  // Preserve the selected font's proportions and fit all rows at one size.
  fontSize.value = Math.min(40, fontSize.value * 320 / widest)
}
onMounted(() => {
  void fitLabels()
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncHighlight)
  document.addEventListener('visibilitychange', syncHighlight)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    syncHighlight()
  })
  if (host.value) observer.observe(host.value)
})
watch(activeFont, fitLabels, { flush: 'post' })
onBeforeUnmount(() => {
  fontRequest++
  clearInterval(timer)
  observer?.disconnect()
  motion?.removeEventListener('change', syncHighlight)
  document.removeEventListener('visibilitychange', syncHighlight)
})
</script>

<template>
  <figure ref="host" class="tablet-pin">
    <div class="tablet-pin__art" role="img" :aria-label="`Orange type menu on a front-facing tablet, ${activeFont.label}`">
      <svg class="tablet" viewBox="0 0 560 560" aria-hidden="true">
        <defs>
          <linearGradient :id="`${id}-metal`" x1="0" y1="0" x2=".8" y2="1">
            <stop stop-color="#f4f4f2" />
            <stop offset=".18" stop-color="#8c8d90" />
            <stop offset=".5" stop-color="#34373a" />
            <stop offset=".82" stop-color="#929499" />
            <stop offset="1" stop-color="#eeeeec" />
          </linearGradient>
          <linearGradient :id="`${id}-glass`" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#fff" stop-opacity=".22" />
            <stop offset=".3" stop-color="#fff" stop-opacity="0" />
            <stop offset="1" stop-color="#fff" stop-opacity=".07" />
          </linearGradient>
          <radialGradient :id="`${id}-shadow`">
            <stop stop-color="#000" stop-opacity=".65" />
            <stop offset=".5" stop-color="#000" stop-opacity=".22" />
            <stop offset="1" stop-color="#000" stop-opacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="280" cy="453" rx="249" ry="20" :fill="`url(#${id}-shadow)`" />
        <rect x="54" y="100" width="452" height="350" rx="25" :fill="`url(#${id}-metal)`" />
        <rect x="55.5" y="101.5" width="449" height="347" rx="23.5" fill="#050606" />
        <rect x="65" y="112" width="430" height="326" rx="14" fill="#ff6500" />
        <rect x="58" y="104" width="444" height="342" rx="21" fill="none" :stroke="`url(#${id}-glass)`" stroke-width=".8" />
        <circle cx="60" cy="275" r="1.8" fill="#15181d" />
        <circle cx="60" cy="274.5" r=".65" fill="#303642" />
        <g class="tablet__micro">
          <circle cx="77" cy="123" r="3" fill="currentColor" />
          <text x="85" y="125">AB TERMINAL</text>
          <text x="482" y="125" text-anchor="end">{{ activeFont.label }}</text>
        </g>
        <g ref="menu" class="tablet__menu" :style="{ fontSize: `${fontSize}px` }">
          <g v-for="(label, index) in labels" :key="label" :class="{ 'is-selected': index === highlighted }">
            <circle cx="92" :cy="177 + index * 46" r="18" />
            <text x="135" :y="190 + index * 46">{{ label }}</text>
          </g>
        </g>
      </svg>
    </div>
    <figcaption>Type on screen</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.tablet-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background:
      radial-gradient(ellipse 85% 25% at 50% 87%, #d5d9e3a6, transparent),
      linear-gradient(180deg, #08090a 5%, #101114 48%, #292d37 65%, #a9b1c1 84%, #c9ced8 100%);
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}

.tablet {
  display: block;
  width: 100%;
  height: 100%;
  font-family: var(--font-sans);

  &__micro {
    font-size: 5px;
    font-weight: 500;
    fill: #20221f;
    color: #20221f;
  }

  &__menu {
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
    letter-spacing: -.035em;
    fill: #f1f1e9;
    > g { transition: fill 150ms ease-out; }
    .is-selected { fill: #20221f; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .tablet__menu > g { transition: none; }
}
</style>
