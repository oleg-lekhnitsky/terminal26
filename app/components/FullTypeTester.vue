<script setup lang="ts">
const { activeFont } = useFontSelection()
const id = useId()
const editor = useTemplateRef('editor')
const editing = ref(false)
useKeyboardReveal(editor, editing)
const defaultText = 'Type here.\nMake it yours.'
const text = ref(defaultText)
const caps = ref(false)
const size = ref(50)
const tracking = ref(-.02)
const leading = ref(1.05)
const alignment = ref<'left' | 'center' | 'right'>('left')
const alignments = ['left', 'center', 'right'] as const
const trackingLabel = computed(() => `${tracking.value > 0 ? '+' : ''}${tracking.value.toFixed(2)} em`)
const appearance = computed(() => ({
  fontSize: `${size.value}px`,
  fontWeight: activeFont.value.weight,
  fontStyle: activeFont.value.style,
  letterSpacing: `${tracking.value}em`,
  lineHeight: leading.value,
  textAlign: alignment.value,
  textTransform: caps.value ? 'uppercase' as const : 'none' as const,
}))
</script>

<template>
  <section :id="`${id}-tester`" class="type-tester" aria-label="Type tester">
    <div class="type-tester__controls">
      <label class="type-tester__range">
        <span>Size <output>{{ size }} px</output></span>
        <input v-model.number="size" type="range" min="16" max="240" step="1" :aria-valuetext="`${size} pixels`" />
      </label>
      <label class="type-tester__range">
        <span>Letter spacing <output>{{ trackingLabel }}</output></span>
        <input v-model.number="tracking" type="range" min="-0.08" max="0.16" step="0.01" :aria-valuetext="trackingLabel" />
      </label>
      <label class="type-tester__range">
        <span>Line height <output>{{ leading.toFixed(2) }}</output></span>
        <input v-model.number="leading" type="range" min="0.8" max="1.8" step="0.05" :aria-valuetext="`${leading.toFixed(2)} times font size`" />
      </label>
      <div class="type-tester__formatting">
        <button type="button" class="type-tester__caps" :aria-pressed="caps" @click="caps = !caps">Caps</button>
      <div class="type-tester__alignment" role="group" aria-label="Text alignment">
        <button v-for="align in alignments" :key="align" type="button" :aria-label="`Align ${align}`" :aria-pressed="alignment === align" @click="alignment = align">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16M4 13h16" />
            <path :d="align === 'left' ? 'M4 9h10M4 17h10' : align === 'right' ? 'M10 9h10M10 17h10' : 'M7 9h10M7 17h10'" />
          </svg>
        </button>
      </div>
      </div>
    </div>

    <div class="type-tester__info">
      <span>{{ activeFont.label }} · Latin &amp; Cyrillic</span>
      <span>Click or tap the text to edit</span>
    </div>

    <textarea ref="editor" v-model="text" @focus="editing = true" @blur="editing = false" class="type-tester__text" :style="appearance" aria-label="Text to preview" placeholder="Type here…" spellcheck="false" />
  </section>
</template>

<style scoped lang="scss">
.type-tester {
  width: 100%;
  min-width: 0;
  min-height: calc(100svh - 2 * var(--space-3));
  
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 3vw, 48px);
  background: transparent;
  color: var(--color-text);
  color-scheme: dark;
  font-family: var(--font-sans);
  font-weight: 400;
  font-style: normal;
  font-size: 13px;

  &__info {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  &__info { justify-content: space-between; gap: 12px; }
  button { font: inherit; color: inherit; }
  button {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 44px; padding: 8px 14px; border: 0;
    border-radius: var(--radius-full); background: #ffffff0a; cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease, scale 150ms ease;
    &:active { scale: .96; }
  }
  svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  &__controls {
    width: 100%; max-width: 860px; align-self: flex-start;
    display: grid; grid-template-columns: repeat(3, minmax(140px, 1fr)) auto;
    gap: 24px; align-items: end; padding-bottom: 20px; border-bottom: 1px solid #ffffff26;
  }
  label { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  &__range > span { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  output { font-variant-numeric: tabular-nums; white-space: nowrap; opacity: .6; }
  input[type='range'] {
    appearance: none; width: 100%; height: 44px; margin: 0;
    background: transparent; cursor: pointer;
    &::-webkit-slider-runnable-track { height: 1px; background: #ffffff60; }
    &::-moz-range-track { height: 1px; background: #ffffff60; }
    &::-webkit-slider-thumb {
      appearance: none; width: 10px; height: 10px; margin-top: -4.5px;
      border: 0; border-radius: 50%; background: #ede9e1;
    }
    &::-moz-range-thumb {
      width: 10px; height: 10px;
      border: 0; border-radius: 50%; background: #ede9e1;
    }
  }
  &__formatting { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  &__caps[aria-pressed='true'] { background: #ede9e1; color: #24221f; }
  &__alignment { display: flex; gap: 2px; }
  &__alignment button { min-width: 44px; padding: 10px; background: transparent; }
  &__alignment button[aria-pressed='true'] { background: #ede9e1; color: #24221f; }
  @media (hover: hover) {
    &__formatting button:hover { background: #f2df64; color: #24221f; }
  }
  &__text {
    display: block; flex: 1 0 auto; width: 100%; min-width: 0; min-height: 55svh;
    padding: 4px; margin: 0; resize: vertical;
    border: 0; border-radius: 4px; background: transparent; color: inherit;
    font-family: var(--font-sans); overflow-wrap: anywhere; caret-color: #d5ef72;
    &:focus { outline: none; color: #d5ef72; }
    &::placeholder { color: currentColor; opacity: .35; }
    &::selection { background: #d5ef72; color: #24221f; }
  }
  &__info { opacity: .6; }
  :is(button, input):focus-visible { outline: 2px solid #ede9e1; outline-offset: 4px; }

}

@media (max-width: 760px) {
  .type-tester__controls { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; }
  .type-tester__formatting { justify-content: flex-end; }
}
@media (max-width: 480px) {
  .type-tester__controls { gap: 12px 16px; }
  .type-tester__range > span { flex-wrap: wrap; gap: 4px; }
  .type-tester__info { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .type-tester button { transition: none; }
}
</style>
