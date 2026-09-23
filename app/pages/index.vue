<script setup lang="ts">
import { textPresets } from '~/utils/textRenderer'
const { activeFont } = useFontSelection()
</script>

<template>
  <main class="home-page" :style="{ '--specimen-weight': activeFont.weight, '--specimen-style': activeFont.style }">
    <div class="motion-board">
      <template v-for="preset in textPresets" :key="preset.id">
        <GraphicClockCard v-if="preset.id === 'fan'" />
        <FontPricingCard v-else-if="preset.id === 'typewriter'" />
        <FontPresetCard v-else :preset="preset" />
        <TypeMockupCard v-if="preset.id === 'letter'" />
        <TypeMockupCard v-if="preset.id === 'slide'" kind="truck" />
        <TypeMockupCard v-if="preset.id === 'poster'" kind="coffee" />
        <ToteBagCard v-if="preset.id === 'words'" />
      </template>
      <LetterCubeCard />
      <SpecimenWheelCard />
      <AsciiAnimationCard />
      <GlyphDrawingCard />
      <GradientButtonCard />
      <AsciiGlobeCard />
      <PhotoSceneCard />
      <PosterMakerCard />
      <RadioDiscCard />
      <PharmacySignCard />
      <CityCameraCard />
      <WeatherCard />
      <MinskFlightsCard />
      <ExchangeRateCard />
    </div>
  </main>
  <FontStyleSelector />
</template>

<style scoped lang="scss">
.motion-board {
  inline-size: 100%;
  columns: 22rem;
  column-gap: var(--space-3);
}

.home-page {
  background-color: var(--deslop-base-background);
  background-image: radial-gradient(var(--deslop-primary-10) 0.7px, transparent 0.7px);
  background-size: 64px 64px;
  min-width: 0;
  min-height: 100dvh;
  display: grid;
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
