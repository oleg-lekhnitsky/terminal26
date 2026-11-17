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
import { fontProducts } from '~/utils/fontShop'
import type { Component } from 'vue'

const siteUrl = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const pageTitle = 'AB Terminal — Typeface by Alex Blohin'
const description = 'AB Terminal is a typeface by Belarusian designer and art director Alex Blohin. Eight styles, with Latin and Cyrillic support, including Belarusian.'
const fullFamily = fontProducts.find(product => product.id === 'full-pack')!
useSeoMeta({
  title: pageTitle,
  description,
  author: 'Alex Blohin',
  ogTitle: pageTitle,
  ogDescription: description,
  ogType: 'website',
  ogSiteName: 'AB Terminal',
  ogUrl: `${siteUrl}/`,
  ogImage: `${siteUrl}/og/ab-og.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Lowercase a and b in AB Terminal, shown in white on black.',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: description,
  twitterImage: `${siteUrl}/og/ab-og.png`,
  twitterImageAlt: 'Lowercase a and b in AB Terminal, shown in white on black.',
}, { tagPriority: 15 })
useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/`, tagPriority: 15 }],
  script: [{
    key: 'site-identity',
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AB Terminal',
      alternateName: 'AB Terminal by Alex Blohin',
      url: `${siteUrl}/`,
      description,
      creator: { '@type': 'Person', name: 'Alex Blohin', jobTitle: 'Designer and art director' },
    }).replace(/</g, '\\u003c'),
  }, {
    key: 'font-product',
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${siteUrl}/#full-family`,
      name: 'AB Terminal — Full family',
      description: `${description} Full family includes all eight styles.`,
      image: `${siteUrl}/og/ab-og.png`,
      sku: 'ab-terminal-full-pack',
      brand: { '@type': 'Brand', name: 'AB Terminal' },
      offers: {
        '@type': 'Offer',
        url: `${siteUrl}/#buy-font`,
        price: fullFamily.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    }).replace(/</g, '\\u003c'),
  }],
})

const { activeFont } = useFontSelection()
const board = useTemplateRef('board')
const buySection = useTemplateRef('buySection')
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
  <main class="home-page" :style="{ '--specimen-family': activeFont.family, '--specimen-weight': activeFont.weight, '--specimen-style': activeFont.style }">
    <header class="home-hero">
      <div class="home-hero__author">
        <img class="home-hero__avatar" src="/favicon/frame-0.png" width="40" height="40" alt="" />
        <p>by Alex Blohin</p>
      </div>
      <div class="home-hero__content">
        <HeroHeading />
        <button class="home-hero__buy" type="button" aria-haspopup="dialog" @click="buySection?.openShop()">Buy</button>
      </div>
    </header>
    <div ref="board" class="motion-board">
      <div v-for="card in cards" :key="card.id" class="motion-board__item" :data-card="card.id" :style="card.style">
        <div class="motion-board__content">
          <component :is="card.component" v-bind="card.props" />
        </div>
      </div>
    </div>
    <FullTypeTester section-id="try-font" class="home-page__section" />
    <BuyFontSection id="buy-font" ref="buySection" class="home-page__section" />
    <footer class="home-footer home-page__section">
      <p class="home-footer__about">AB Terminal is a typeface by Belarusian designer and art director Alex Blohin. Eight styles, with Latin and Cyrillic support, including Belarusian. For headlines, posters, identities, and digital projects.</p>
      <div class="home-footer__links">
        <a href="mailto:hello@designdep.work">hello@designdep.work</a>
        <a href="https://www.linkedin.com/in/aleksei-blokhin-349b9a238/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
      <nav class="home-footer__links home-footer__navigation" aria-label="Typeface information">
        <a href="#try-font">Try the typeface</a>
        <a href="#buy-font">Buy AB Terminal</a>
        <NuxtLink to="/license">Font license</NuxtLink>
      </nav>
    </footer>
  </main>
  <FontStyleSelector />
</template>

<style scoped lang="scss">
.home-footer {
  width: min(100%, 44rem);
  padding: var(--space-6);
  text-align: center;
  font-family: var(--specimen-family, var(--font-sans));
  font-weight: var(--specimen-weight, 400);
  font-style: var(--specimen-style, normal);

  &__about {
    margin-bottom: 24px;
    font-size: 16px;
    line-height: 1.5;
    text-wrap: pretty;
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px 24px;
  }

  &__navigation { margin-top: 24px; }

  a {
    color: var(--color-text);
    font-family: var(--specimen-family, var(--font-sans));
    font-weight: var(--specimen-weight, 400);
    font-style: var(--specimen-style, normal);
    font-size: 16px;
    text-underline-offset: .2em;
    text-decoration-thickness: 1px;

    @media (hover: hover) { &:hover { text-decoration: none; } }
  }
}

.home-hero {
  position: relative;
  width: 100%; min-width: 0;
  min-height: 65svh;
  display: grid; place-items: center;
  grid-template-rows: auto 1fr;
  row-gap: 64px;
  padding-block: clamp(24px, 2vw, 40px) clamp(48px, 5vw, 80px);
  text-align: center;

  &__avatar {
    width: 40px; height: 40px; object-fit: cover;
  }
  &__buy {
    min-height: 56px; padding: 16px 32px; border: 0; border-radius: var(--radius-full);
    background: #eeeae3; color: #24221f; font: 400 18px var(--font-sans); cursor: pointer;
    font-family: var(--specimen-family, var(--font-sans)); font-weight: var(--specimen-weight, 400); font-style: var(--specimen-style, normal);
    transition: background-color 150ms ease, scale 150ms ease;
    @media (hover: hover) { &:hover { background: #daf759; } }
    &:active { scale: .96; }
    &:focus-visible { outline: 2px solid #daf759; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { transition: none; }
  }
  &__content { display: grid; justify-items: center; gap: clamp(32px, 4vw, 64px); min-width: 0; }
  &__author { display: grid; justify-items: center; gap: 20px; }
  p {
    margin: 0; color: var(--color-text); font-family: var(--font-sans);
    font-size: 13px; font-weight: 400; font-style: normal; opacity: .6;
  }

  h1 {
    margin: 0; color: var(--color-text); font-family: var(--font-sans);
    font-size: clamp(36px, 8vw, 144px); line-height: .95;
    font-family: var(--specimen-family, var(--font-sans)); font-weight: var(--specimen-weight, 400); font-style: var(--specimen-style, normal);
    letter-spacing: -.04em;
  }
}

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
  min-width: 0;
  min-height: 100dvh;
  display: grid;
  row-gap: 0;
  position: relative;
  container-type: inline-size;
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

  &__section { margin-top: clamp(var(--space-24), 10vw, 10rem); }
}
</style>
