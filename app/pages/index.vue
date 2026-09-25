<script setup lang="ts">
import {
  FontPresetCard, GraphicClockCard, FontPricingCard, TypeMockupCard, AlphabetCard,
  ToteBagCard, LetterCubeCard, SpecimenWheelCard, WatchFaceCard, TabletTypeCard,
  AsciiAnimationCard, GlyphDrawingCard, GradientButtonCard, AsciiGlobeCard,
  PhotoSceneCard, PosterMakerCard, RadioDiscCard, PharmacySignCard, CityCameraCard,
  WeatherCard, MinskFlightsCard, ExchangeRateCard,
} from '#components'
import { textPresets } from '~/utils/textRenderer'
import { galleryLayouts, galleryCardStyle, type GalleryCardId } from '~/utils/galleryLayout'
import type { Component } from 'vue'

const { activeFont } = useFontSelection()
const board = useTemplateRef('board')
const catalogue: Record<string, { component: Component; props?: Record<string, unknown> }> = {
  ...Object.fromEntries(textPresets
    .filter(preset => !['fan', 'typewriter'].includes(preset.id))
    .map(preset => [preset.id, { component: FontPresetCard, props: { preset } }])),
  clock: { component: GraphicClockCard }, pricing: { component: FontPricingCard },
  can: { component: TypeMockupCard }, truck: { component: TypeMockupCard, props: { kind: 'truck' } },
  coffee: { component: TypeMockupCard, props: { kind: 'coffee' } }, alphabet: { component: AlphabetCard },
  tote: { component: ToteBagCard }, cube: { component: LetterCubeCard },
  wheel: { component: SpecimenWheelCard }, watch: { component: WatchFaceCard },
  tablet: { component: TabletTypeCard }, ascii: { component: AsciiAnimationCard },
  glyph: { component: GlyphDrawingCard }, gradient: { component: GradientButtonCard },
  globe: { component: AsciiGlobeCard }, photo: { component: PhotoSceneCard },
  'poster-maker': { component: PosterMakerCard }, radio: { component: RadioDiscCard },
  pharmacy: { component: PharmacySignCard }, city: { component: CityCameraCard },
  weather: { component: WeatherCard }, flights: { component: MinskFlightsCard },
  exchange: { component: ExchangeRateCard },
}
const cards = galleryLayouts[1][0].map((id: GalleryCardId) => ({
  id, ...catalogue[id]!, style: galleryCardStyle(id),
}))
let observer: ResizeObserver | undefined
let frame = 0
const pending = new Set<HTMLElement>()

onMounted(() => {
  if (!board.value) return
  // Measure the content, never the grid item: changing its span must not
  // feed back into the observed height. Component instances stay mounted.
  observer = new ResizeObserver(entries => {
    entries.forEach(entry => pending.add(entry.target as HTMLElement))
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const heights = Array.from(pending, content => ({
        item: content.parentElement!, height: Math.ceil(content.getBoundingClientRect().height),
      }))
      pending.clear()
      heights.forEach(({ item, height }) => item.style.setProperty('--card-rows', String(Math.max(1, height))))
      board.value?.classList.add('is-measured')
    })
  })
  board.value.querySelectorAll<HTMLElement>('.motion-board__content').forEach(content => observer!.observe(content))
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
  pending.clear()
})
</script>

<template>
  <main class="home-page" :style="{ '--specimen-weight': activeFont.weight, '--specimen-style': activeFont.style }">
    <div ref="board" class="motion-board">
      <div v-for="card in cards" :key="card.id" class="motion-board__item" :data-card="card.id" :style="card.style">
        <div class="motion-board__content">
          <component :is="card.component" v-bind="card.props" />
        </div>
      </div>
    </div>
    <FullTypeTester />
  </main>
  <FontStyleSelector />
</template>

<style scoped lang="scss">
.motion-board {
  inline-size: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-flow: dense;
  column-gap: var(--space-3);
  align-items: start;

  &__item {
    min-width: 0;
    grid-column: var(--column-1);
    order: var(--order-1);
  }
  // Contain each figure's existing bottom margin so it is part of the measurement.
  &__content { display: flow-root; min-width: 0; }
  &.is-measured { grid-auto-rows: 1px; }
  &.is-measured &__item { grid-row: span var(--card-rows, 1); }
}

@container (min-width: 45rem) {
  .motion-board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .motion-board__item { grid-column: var(--column-2); order: var(--order-2); }
}
@container (min-width: 68rem) {
  .motion-board { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .motion-board__item { grid-column: var(--column-3); order: var(--order-3); }
}
@container (min-width: 91rem) {
  .motion-board { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .motion-board__item { grid-column: var(--column-4); order: var(--order-4); }
}

.home-page {
  background-color: var(--deslop-base-background);
  background-image: radial-gradient(var(--deslop-primary-10) 0.7px, transparent 0.7px);
  background-size: 64px 64px;
  min-width: 0;
  min-height: 100dvh;
  display: grid;
  row-gap: clamp(var(--space-24), 10vw, 10rem);
  position: relative;
  container-type: inline-size;
  background-position: -4px -4px;
  align-items: start;
  justify-items: center;
  padding: var(--space-3);
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
  transition: background-color 0.16s linear,
    padding-right 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
</style>
