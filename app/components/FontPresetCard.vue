<script setup lang="ts">
import type { textPresets } from '~/utils/textRenderer'
import { oneShotText } from '~/utils/fontSymbols'
import { fontVariants } from '~/utils/fontVariants'

const { activeFont } = useFontSelection()

const props = defineProps<{
  preset: typeof textPresets[number]
}>()
const dropWords = ['Латиница', 'Cyrillic']
const dropIndex = ref(0)
const styleIndex = ref(0)
const specimenFont = computed(() => props.preset.id === 'words' ? fontVariants[styleIndex.value]! : activeFont.value)
const specimenText = computed(() => props.preset.id === 'letter'
  ? oneShotText(activeFont.value.id)
  : props.preset.id === 'words' ? specimenFont.value.label
  : props.preset.id === 'drop' ? dropWords[dropIndex.value]! : props.preset.text)
function advanceWord() {
  if (props.preset.id === 'drop') dropIndex.value = (dropIndex.value + 1) % dropWords.length
  if (props.preset.id === 'words') styleIndex.value = (styleIndex.value + 1) % fontVariants.length
}
</script>

<template>
  <figure class="motion-pin">
    <div
      class="motion-pin__art"
      :class="{ 'motion-pin__art--poster': preset.id === 'poster' }"
      :style="{
        backgroundColor: preset.background,
        color: preset.color,
        aspectRatio: preset.aspectRatio,
      }"
    >
      <FlipFlopText
        v-if="preset.id === 'carousel'"
        class="motion-pin__specimen"
        :text="specimenText"
        :color="preset.color"
        :background="preset.background"
      />
      <WebGLText
        v-else
        class="motion-pin__specimen"
        :text="specimenText"
        :preset="preset.id"
        :duration="preset.duration"
        :stagger="preset.stagger"
        :delay="preset.delay"
        :color="preset.color"
        :letter-spacing="preset.letterSpacing"
        :whole-text="preset.id === 'words'"
        :speed="1"
        :font-weight="specimenFont.weight"
        :font-style="specimenFont.style"
        @cycle-complete="advanceWord"
        loop
      />
      <template v-if="preset.id === 'poster'">
        <div class="motion-pin__micro motion-pin__micro--top"><span>AB TERMINAL</span><span>TYPE STUDY</span></div>
        <div class="motion-pin__micro motion-pin__micro--bottom"><span>{{ specimenFont.label }}</span><span>LATIN / CYRILLIC</span></div>
      </template>
    </div>
    <figcaption>{{ preset.name }}</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.motion-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-xl);
    // Clip the composited WebGL surface explicitly, including inside Firefox columns.
    clip-path: inset(0 round var(--radius-xl));
    isolation: isolate;
  }

  &__specimen {
    position: absolute;
    inset: 0;
    --webgl-text-height: 100%;
  }

  &__art--poster { container-type: inline-size; }
  &__micro {
    position: absolute;
    inset-inline: 8%;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-family: var(--font-sans);
    font-size: clamp(10px, 2.5cqw, 13px);
    font-weight: 400;
    font-style: normal;
    line-height: 1.3;
    pointer-events: none;
    &--top { top: 6%; }
    &--bottom { bottom: 6%; }
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }
}
</style>
