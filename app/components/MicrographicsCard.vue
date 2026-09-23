<script setup lang="ts">
import { generateMicrographics } from '~/utils/micrographics'
import { motionSystem, textPresets, typographySystem } from '~/utils/textRenderer'

const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const seed = ref(7301)
const tiles = computed(() => generateMicrographics(seed.value, activeFont.value.id))
const detail = computed(() => ({
  serial: `AT-${String(seed.value).padStart(6, '0')}`,
  width: 40 + seed.value % 9,
  height: 24 + seed.value % 5,
  revision: String(seed.value % 12 + 1).padStart(2, '0'),
  bars: Array.from({ length: 48 }, (_, index) => ((seed.value * (index + 7) ^ (index * 31)) >>> 0) % 3 + 1),
}))
const palette = textPresets.find(preset => preset.id === 'drop')!
const style = {
  '--micro-bg': palette.background, '--micro-ink': palette.color,
  '--micro-enter': `${motionSystem.enter}s`, '--micro-exit': `${motionSystem.exit}s`,
  '--micro-tracking': `${typographySystem.letterSpacing}em`,
  '--micro-travel': `${motionSystem.travel}em`,
}
let observer: IntersectionObserver | undefined
let motion: MediaQueryList | undefined
let timer: ReturnType<typeof setInterval> | undefined
let visible = false
let disposed = false
const changing = ref(false)
let unlock: ReturnType<typeof setTimeout> | undefined
function generate() {
  if (changing.value || disposed) return
  seed.value += 1
  changing.value = true
  clearTimeout(unlock)
  unlock = setTimeout(() => { changing.value = false }, motion?.matches ? 0 : (motionSystem.enter + motionSystem.exit + motionSystem.stagger * 5) * 1000)
}
function sync() {
  clearInterval(timer)
  if (!disposed && visible && !document.hidden && !motion?.matches) {
    timer = setInterval(generate, motionSystem.hold * 10 * 1000)
  }
}
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync() })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(timer); clearTimeout(unlock); observer?.disconnect()
  motion?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="micro-pin" :style="style">
    <div class="micro-pin__art">
      <div class="micro-pin__stage">
        <Transition name="mark" mode="out-in">
          <div :key="`${seed}-${activeFont.id}`" class="micro-pin__mark">
            <header class="micro-pin__identity"><span>AB TERMINAL</span><span>AT / {{ detail.revision }}</span></header>
            <div class="micro-pin__rule"><span>MODULAR TYPE SYSTEM</span><span>REV. {{ detail.revision }}</span></div>
            <div class="micro-pin__modules">
              <section class="micro-pin__module">
                <p class="micro-pin__label">01 / IDENTIFICATION</p>
                <p class="micro-pin__code">{{ detail.serial }}</p>
                <dl><dt>FACE</dt><dd>{{ activeFont.label.toUpperCase() }}</dd><dt>FORMAT</dt><dd>OPEN TYPE</dd><dt>SET</dt><dd>LAT / CYR</dd><dt>UNIT</dt><dd>1 EM</dd></dl>
                <div class="micro-pin__symbols" aria-label="Font symbols"><span v-for="(tile, index) in tiles.slice(3, 8)" :key="index">{{ tile.glyph }}</span></div>
              </section>
              <section class="micro-pin__module">
                <p class="micro-pin__label">02 / ENVELOPE</p>
                <svg viewBox="0 0 180 128" role="img" :aria-label="`Specimen diagram, ${detail.width} by ${detail.height} units`">
                  <g fill="none" stroke="currentColor" stroke-width=".7">
                    <path d="M32 29h116v66H32z M24 62h132 M90 21v82"/>
                    <path d="M32 17h116 M32 12v10 M148 12v10 M160 29v66 M155 29h10 M155 95h10"/>
                    <circle cx="90" cy="62" r="22"/><circle cx="90" cy="62" r="4"/>
                    <path d="M39 36h8m-4-4v8 M133 88h8m-4-4v8 M39 88h8m-4-4v8 M133 36h8m-4-4v8"/>
                  </g>
                  <g fill="currentColor" text-anchor="middle" font-size="8"><text x="90" y="11">{{ detail.width }}.00</text><text x="172" y="64" transform="rotate(90 172 64)">{{ detail.height }}.00</text><text x="90" y="116">DATUM +00.000</text></g>
                </svg>
              </section>
              <section class="micro-pin__module">
                <p class="micro-pin__label">03 / REGISTRATION</p>
                <svg viewBox="0 0 180 100" aria-hidden="true">
                  <g fill="none" stroke="currentColor" stroke-width=".7"><circle cx="47" cy="46" r="30"/><circle cx="47" cy="46" r="19"/><path d="M8 46h78 M47 7v78"/>
                    <path v-for="tick in 24" :key="tick" :d="`M47 16v${tick % 3 === 0 ? 7 : 3}`" :transform="`rotate(${tick * 15} 47 46)`"/>
                    <path d="M103 25h57 M103 46h39 M103 67h57 M103 78h57"/>
                  </g>
                  <g fill="currentColor" font-size="8"><text x="108" y="20">X +00.00</text><text x="108" y="41">Y +00.00</text><text x="108" y="62">Z {{ detail.revision }}.00</text><text x="30" y="96">0 / 360</text></g>
                </svg>
              </section>
              <section class="micro-pin__module">
                <p class="micro-pin__label">04 / COMPOSITION</p>
                <p>LETTERS + NUMERALS</p><p>SYMBOLS + PUNCTUATION</p>
                <p class="micro-pin__note">ALIGN TO BASELINE<br>KEEP COUNTERS OPEN<br>DO NOT DISTORT</p>
                <p>{{ tiles[0]?.glyph }} / {{ tiles[1]?.glyph }} / {{ tiles[2]?.glyph }} / {{ detail.revision }}</p>
              </section>
            </div>
            <div class="micro-pin__calibration">
              <svg viewBox="0 0 360 23" aria-hidden="true"><path d="M0 1h360" stroke="currentColor"/><path v-for="tick in 61" :key="tick" :d="`M${(tick - 1) * 6} 1v${(tick - 1) % 5 === 0 ? 13 : 6}`" stroke="currentColor" stroke-width=".65"/></svg>
              <div><span>00</span><span>025</span><span>050</span><span>075</span><span>100</span></div>
            </div>
            <div class="micro-pin__trace">
              <svg viewBox="0 0 192 30" aria-hidden="true"><rect v-for="(width, index) in detail.bars" :key="index" :x="index * 4" y="0" :width="width" height="30" fill="currentColor"/></svg>
              <p>{{ detail.serial }}<br>GRAPHIC SPECIMEN</p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <figcaption>Micrographics</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.micro-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { position: relative; container-type: inline-size; aspect-ratio: 4 / 5; border-radius: var(--radius-xl); overflow: hidden; background: var(--micro-bg); color: var(--micro-ink); font-family: var(--font-sans); font-weight: var(--specimen-weight, 700); font-style: var(--specimen-style, normal); letter-spacing: var(--micro-tracking); }
  &__stage { position: absolute; inset: 0; display: grid; place-items: center; }
  &__mark { position: relative; width: 78cqw; text-align: left; font-size: 2cqw; line-height: 1.5; }
  &__mark::before, &__mark::after { content: '+'; position: absolute; font-size: 3cqw; line-height: 1; }
  &__mark::before { top: -5cqw; left: -2cqw; }
  &__mark::after { bottom: -5cqw; right: -2cqw; }
  &__mark p { margin: 0; }
  &__identity, &__rule { display: flex; justify-content: space-between; gap: 2cqw; }
  &__identity { font-size: 3cqw; padding-bottom: 1cqw; border-bottom: 1px solid currentColor; }
  &__rule { padding-block: 1cqw 4cqw; font-size: 1.8cqw; }
  &__modules { display: grid; grid-template-columns: 1fr 1fr; gap: 4cqw; }
  &__module { min-width: 0; }
  &__label { font-size: 1.7cqw; opacity: .7; margin-bottom: 1.5cqw !important; }
  &__code { font-size: 3cqw; margin-bottom: 1cqw !important; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: .2cqw 2cqw; margin: 0; }
  dd { margin: 0; text-align: right; }
  svg { display: block; width: 100%; height: auto; font-family: inherit; font-weight: inherit; font-style: inherit; }
  &__symbols { display: flex; gap: 1.5cqw; margin-top: 2cqw; font-size: 3.5cqw; line-height: 1; }
  &__note { margin-block: 2cqw !important; }
  &__calibration { margin-block: 4cqw 3cqw; }
  &__calibration div { display: flex; justify-content: space-between; font-size: 1.6cqw; }
  &__trace { display: flex; align-items: center; justify-content: space-between; gap: 3cqw; font-size: 1.7cqw; }
  &__trace svg { width: 46%; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
.mark-enter-active { transition: transform var(--micro-enter) var(--ease-flow), opacity var(--micro-enter) var(--ease-flow); }
.mark-leave-active { transition: transform var(--micro-exit) var(--ease-flow), opacity var(--micro-exit) var(--ease-flow); }
.mark-enter-from { opacity: 0; transform: translateY(var(--micro-travel)); }
.mark-leave-to { opacity: 0; transform: translateY(calc(var(--micro-travel) / -2)); }
@media (prefers-reduced-motion: reduce) { .mark-enter-active, .mark-leave-active { transition: none; } }
</style>
