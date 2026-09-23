<script setup lang="ts">
const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const drawing = useTemplateRef<SVGSVGElement>('drawing')
watch(drawing, svg => {
  if (!svg) return
  const outline = svg.querySelector<SVGGElement>('.tote-pin__lines')
  const artwork = svg.querySelector<SVGGElement>('[data-bag-artwork]')
  if (!outline || !artwork) return
  const bounds = outline.getBBox()
  artwork.setAttribute('transform', `translate(${300 - bounds.x - bounds.width / 2} ${330 - bounds.y - bounds.height / 2})`)
}, { flush: 'post' })
const index = ref(0)
const bags = [
  { name: 'BIG TYPE', subtitle: 'The oversized shopper', detail: 'Wide gusset / Double handles', number: '01', background: '#2535f5', ink: '#f5f1df', shape: 'shopper' },
  { name: 'DAILY TYPE', subtitle: 'The everyday tote', detail: 'Flat canvas / Long handles', number: '02', background: '#c8b9e6', ink: '#38264d', shape: 'canvas' },
  { name: 'TYPE TO GO', subtitle: 'The compact carrier', detail: 'Box bottom / Short handles', number: '03', background: '#a9c8d8', ink: '#183746', shape: 'compact' },
  { name: 'SOFT TYPE', subtitle: 'The foldaway shopper', detail: 'Soft body / Integrated handles', number: '04', background: '#dd705f', ink: '#401d23', shape: 'reusable' },
  { name: 'TYPE AROUND', subtitle: 'The crescent shoulder bag', detail: 'Curved body / Adjustable strap', number: '05', background: '#1c5149', ink: '#e9e7d8', shape: 'crescent' },
] as const
const bag = computed(() => bags[index.value]!)
const printY = computed(() => bag.value.shape === 'shopper' ? 365 : bag.value.shape === 'crescent' ? 345 : 340)
let timer: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined
let reduced: MediaQueryList | undefined
let visible = false
const paused = ref(false)
function sync() {
  clearInterval(timer)
  timer = undefined
  if (visible && !document.hidden && !reduced?.matches && !paused.value) timer = setInterval(() => { index.value = (index.value + 1) % bags.length }, 6400)
}
function change(direction: number) {
  index.value = (index.value + direction + bags.length) % bags.length
  sync()
}
function pause(value: boolean) { paused.value = value; sync() }
onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  observer?.disconnect()
  reduced?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="tote-pin">
    <div class="tote-pin__art" :style="{ background: bag.background, color: bag.ink, fontWeight: activeFont.weight, fontStyle: activeFont.style }"
      @mouseenter="pause(true)" @mouseleave="pause(false)" @focusin="pause(true)" @focusout="pause(false)"
      @keydown.left.prevent="change(-1)" @keydown.right.prevent="change(1)">
      <div class="tote-pin__heading" aria-hidden="true"><span>AB TERMINAL / CARRIERS</span><span>{{ bag.number }} / {{ String(bags.length).padStart(2, '0') }}</span></div>
      <Transition name="tote" mode="out-in">
        <svg ref="drawing" :key="bag.shape" class="tote-pin__drawing" viewBox="0 0 600 660" role="img" :aria-label="`${bag.subtitle}. ${bag.detail}. ${bag.name}.`">
          <g data-bag-artwork>
          <g class="tote-pin__lines">
            <template v-if="bag.shape === 'shopper'">
              <path d="M45 225H555V390L443 500H157L45 390Z" />
              <path d="M45 240H555M45 315H555M190 225V500M410 225V500" />
              <path :fill="bag.background" d="M230 240V167L254 144H346L370 167V240H349V165H251V240Z" />
            </template>
            <template v-else-if="bag.shape === 'canvas'">
              <path d="M135 220H465L451 516Q300 540 149 516Z" />
              <path d="M145 232H455M157 232L169 503Q300 523 431 503L443 232" />
              <path :fill="bag.background" d="M200 240V146Q200 66 300 66Q400 66 400 146V240H379V147Q379 87 300 87Q221 87 221 147V240Z" />
              <path d="M195 220V256H226V220M374 220V256H405V220" />
            </template>
            <template v-else-if="bag.shape === 'compact'">
              <path d="M112 233H488L474 468L425 510H175L126 468Z" />
              <path d="M112 248H488M175 248V510M425 248V510M126 468H474" />
              <path :fill="bag.background" d="M214 248V151Q214 123 242 123H358Q386 123 386 151V248H365V155Q365 144 354 144H246Q235 144 235 155V248Z" />
            </template>
            <template v-else-if="bag.shape === 'reusable'">
              <path d="M130 225L163 102Q193 87 226 102L235 215Q300 257 365 215L374 102Q407 87 437 102L470 225L485 482Q483 527 443 533H157Q117 527 115 482Z" />
              <path d="M154 226L182 119Q194 115 208 119L218 225M446 226L418 119Q406 115 392 119L382 225" />
              <path d="M140 253L137 479Q137 510 165 513H435Q463 510 463 479L460 253M149 488L169 513M451 488L431 513" />
            </template>
            <template v-else>
              <path d="M105 253Q300 290 495 253Q492 456 300 477Q108 456 105 253Z" />
              <path d="M121 274Q300 306 479 274Q468 437 300 458Q132 437 121 274M111 265Q300 300 489 265" />
              <path :fill="bag.background" d="M113 256Q137 76 300 72Q463 76 487 256L465 260Q442 99 300 95Q158 99 135 260Z" />
              <path d="M157 151L181 161L192 135L169 126ZM445 238L465 241L469 263L449 260Z" />
            </template>
          </g>
          <g fill="currentColor" text-anchor="middle">
            <text x="300" :y="printY" :font-size="bag.shape === 'shopper' ? 38 : 32" letter-spacing="-1">{{ bag.name }}</text>
            <text x="300" :y="printY + 29" font-size="11">{{ bag.subtitle }}</text>
            <text x="300" :y="printY + 46" font-size="9">{{ bag.detail }}</text>
            <text x="300" :y="bag.shape === 'crescent' ? 434 : 465" font-size="10">AB / {{ bag.number }}</text>
          </g>
          </g>
        </svg>
      </Transition>
      <div class="tote-pin__footer" aria-hidden="true"><span>LETTERS TO CARRY.</span><span>TYPE GOODS</span></div>
      <button class="tote-pin__nav tote-pin__nav--prev" type="button" aria-label="Previous tote bag" @click="change(-1)" />
      <button class="tote-pin__nav tote-pin__nav--next" type="button" aria-label="Next tote bag" @click="change(1)" />
    </div>
    <figcaption>Type carrier</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.tote-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { position: relative; container-type: inline-size; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--radius-xl); font-family: var(--font-sans); transition: background-color .4s ease, color .4s ease; }
  &__heading, &__footer { position: absolute; inset-inline: 7cqw; display: flex; justify-content: space-between; gap: 1rem; font-size: 2cqw; letter-spacing: .03em; font-style: normal; font-weight: 400; }
  &__heading { top: 8cqw; } &__footer { bottom: 8cqw; }
  &__drawing { position: absolute; top: 50%; left: 0; width: 100%; transform: translateY(-50%); overflow: visible; }
  &__lines { fill: none; stroke: currentColor; stroke-width: 1; stroke-linejoin: miter; }
  &__nav { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; position: absolute; top: 0; bottom: 0; width: 30%; border: 0; background: transparent; cursor: pointer; padding: 0; }
  &__nav::after { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .16s ease; pointer-events: none; }
  @media (hover: hover) { &__nav:hover::after { opacity: 1; } }
  &__nav--prev { left: 0; } &__nav--next { right: 0; }
  &__nav--prev::after { background: linear-gradient(90deg, #ffffff14, transparent); }
  &__nav--next::after { background: linear-gradient(-90deg, #ffffff14, transparent); }
  &__nav:focus-visible { outline: 2px solid currentColor; outline-offset: -5px; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
.tote-enter-active, .tote-leave-active { transition: opacity .2s ease; }
.tote-enter-from, .tote-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .tote-pin__art, .tote-pin__nav::after, .tote-enter-active, .tote-leave-active { transition: none; }
}
</style>
