<script setup lang="ts">
const { activeFont } = useFontSelection()
const host = useTemplateRef('host')
const index = ref(0)
const scenes = [
  { id: 'pool', label: 'Pool', alt: 'Two swimmers in turquoise water, photographed from above with flash glints.' },
  { id: 'office', label: 'Office', alt: 'A late-night desk with a telephone, keyboard and chrome lamp, lit by direct flash.' },
  { id: 'tennis', label: 'Tennis', alt: 'A racket and bright tennis balls on a dark green court at dusk.' },
  { id: 'sunset', label: 'Sunset', alt: 'An orange ocean sunset above a flash-lit seaside ledge.' },
  { id: 'coffee', label: 'Coffee', alt: 'Espresso on a stainless steel cafe table, with hard flash reflections.' },
] as const
const scene = computed(() => scenes[index.value]!)
const src = (id: string) => `/images/flash-scenes/${id}.jpg`
const typeSize = computed(() => `${Math.min(30, 82 / (scene.value.label.length * .65 + (activeFont.value.style === 'italic' ? .4 : 0)))}cqw`)
const failed = ref(false)
let observer: IntersectionObserver | undefined
let reduced: MediaQueryList | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let visible = false
let hover = false
let focused = false
let disposed = false
let request = 0
const loaded = new Map<string, Promise<void>>()
function preload(id: string) {
  if (!loaded.has(id)) {
    const image = new Image()
    image.src = src(id)
    loaded.set(id, image.decode().catch(error => { loaded.delete(id); throw error }))
  }
  return loaded.get(id)!
}
function sync() {
  clearTimeout(timer)
  if (disposed || !visible || document.hidden || hover || focused || reduced?.matches) return
  timer = setTimeout(() => { void change(1) }, 8000)
}
async function change(direction: number) {
  clearTimeout(timer)
  const version = ++request
  const next = (index.value + direction + scenes.length) % scenes.length
  failed.value = false
  try {
    await preload(scenes[next]!.id)
    if (disposed || version !== request) return
    index.value = next
  } catch { if (!disposed && version === request) failed.value = true }
  if (!disposed && version === request) sync()
}
function setHover(value: boolean) { hover = value; sync() }
function setFocus(value: boolean) { focused = value; sync() }
onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.addEventListener('change', sync)
  document.addEventListener('visibilitychange', sync)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    if (visible) void preload(scenes[(index.value + 1) % scenes.length]!.id).catch(() => {})
    sync()
  })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => {
  disposed = true
  request++
  clearTimeout(timer)
  observer?.disconnect()
  reduced?.removeEventListener('change', sync)
  document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <figure ref="host" class="photo-pin">
    <div class="photo-pin__art" :style="{ fontWeight: activeFont.weight, fontStyle: activeFont.style }"
      @mouseenter="setHover(true)" @mouseleave="setHover(false)" @focusin="setFocus(true)" @focusout="setFocus(false)"
      @keydown.left.prevent="change(-1)" @keydown.right.prevent="change(1)">
      <Transition name="photo-fade">
        <img :key="scene.id" class="photo-pin__image" :src="src(scene.id)" :alt="scene.alt" width="960" height="1200" loading="lazy" decoding="async">
      </Transition>
      <div class="photo-pin__shade" aria-hidden="true" />
      <span class="photo-pin__number">/{{ String(index + 1).padStart(2, '0') }}</span>
      <Transition name="photo-word" mode="out-in">
        <span :key="scene.id" class="photo-pin__word" :style="{ fontSize: typeSize }">{{ scene.label }}</span>
      </Transition>
      <div class="photo-pin__footer"><span>AB Terminal</span><span>{{ activeFont.label }} / Flash studies</span></div>
      <button class="photo-pin__nav photo-pin__nav--prev" type="button" aria-label="Previous photo" @click="change(-1)" />
      <button class="photo-pin__nav photo-pin__nav--next" type="button" aria-label="Next photo" @click="change(1)" />
      <span v-if="failed" class="photo-pin__error" role="status">Photo couldn’t load. Try again.</span>
    </div>
    <figcaption>Flash studies</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.photo-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { position: relative; isolation: isolate; container-type: inline-size; aspect-ratio: 4 / 5; border-radius: var(--radius-xl); overflow: hidden; background: #173d35; color: #fff; font-family: var(--font-sans); }
  &__image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  &__shade { position: absolute; inset: 0; background: linear-gradient(180deg, #0002, #00000012 25%, #0002 65%, #0006); pointer-events: none; }
  &__number { position: absolute; top: 7cqw; left: 8cqw; font-size: 3cqw; font-weight: 400; font-style: normal; }
  &__word { position: absolute; inset: 0; display: grid; place-items: center; line-height: 1; letter-spacing: -.04em; padding: 0 6cqw 3cqw; white-space: nowrap; pointer-events: none; text-shadow: 0 1px 12px #0002; }
  &__footer { position: absolute; bottom: 7cqw; left: 8cqw; display: grid; gap: 1cqw; font-size: 2.5cqw; line-height: 1.2; font-weight: 400; font-style: normal; }
  &__nav { appearance: none; -webkit-appearance: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; position: absolute; top: 0; bottom: 0; width: 33%; border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; }
  &__nav::after { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .16s ease; }
  @media (hover: hover) { &__nav:hover::after { opacity: 1; } }
  &__nav--prev { left: 0; } &__nav--next { right: 0; }
  &__nav--prev::after { background: linear-gradient(90deg, #0003, transparent); }
  &__nav--next::after { background: linear-gradient(-90deg, #0003, transparent); }
  &__nav:focus-visible { outline: 2px solid #fff; outline-offset: -5px; }
  &__error { position: absolute; bottom: 2cqw; inset-inline: 8cqw; font-size: 2.5cqw; pointer-events: none; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
.photo-fade-enter-active, .photo-fade-leave-active { transition: opacity .8s var(--ease-flow); }
.photo-fade-enter-from, .photo-fade-leave-to { opacity: 0; }
.photo-word-enter-active, .photo-word-leave-active { transition: opacity .2s ease; }
.photo-word-enter-from, .photo-word-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .photo-fade-enter-active, .photo-fade-leave-active, .photo-word-enter-active, .photo-word-leave-active, .photo-pin__nav::after { transition: none; }
}
</style>
