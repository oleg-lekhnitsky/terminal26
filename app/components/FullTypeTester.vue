<script setup lang="ts">
const { activeFont } = useFontSelection()
const id = useId()
const editor = useTemplateRef('editor')
const editing = ref(false)
const settingsOpen = ref(false)
useKeyboardReveal(editor, editing)
const defaultText = 'Type something nice here'
const text = ref(defaultText)
const caps = ref(false)
const size = ref(50)
const sizeAdjusted = ref(false)
function syncDefaultSize() {
  if (sizeAdjusted.value) return
  size.value = window.innerWidth > 760 ? 160 : 50
}
onMounted(() => {
  syncDefaultSize()
  window.addEventListener('resize', syncDefaultSize)
})
onBeforeUnmount(() => window.removeEventListener('resize', syncDefaultSize))
const tracking = ref(-.02)
const leading = ref(1.05)
const alignment = ref<'left' | 'center' | 'right'>('center')
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
    <div class="type-tester__toolbar">
      <span class="type-tester__info">{{ activeFont.label }} · Latin &amp; Cyrillic</span>
      <button type="button" class="type-tester__settings-toggle"
        :aria-expanded="settingsOpen" :aria-controls="`${id}-settings`" @click="settingsOpen = !settingsOpen">
        <span>Text settings</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="settingsOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'" /></svg>
      </button>
    <div :id="`${id}-settings`" class="type-tester__controls" :class="{ 'is-open': settingsOpen }">
      <label class="type-tester__range">
        <span>Size <output>{{ size }} px</output></span>
        <input v-model.number="size" type="range" min="16" max="240" step="1" :aria-valuetext="`${size} pixels`"
          @input="sizeAdjusted = true" />
      </label>
      <label class="type-tester__range">
        <span>Letter spacing <output>{{ trackingLabel }}</output></span>
        <input v-model.number="tracking" type="range" min="-0.08" max="0.16" step="0.01"
          :aria-valuetext="trackingLabel" />
      </label>
      <label class="type-tester__range">
        <span>Line height <output>{{ leading.toFixed(2) }}</output></span>
        <input v-model.number="leading" type="range" min="0.8" max="1.8" step="0.05"
          :aria-valuetext="`${leading.toFixed(2)} times font size`" />
      </label>
      <div class="type-tester__formatting">
        <button type="button" class="type-tester__caps" :aria-pressed="caps" @click="caps = !caps">Caps</button>
        <div class="type-tester__alignment" role="group" aria-label="Text alignment">
          <button v-for="align in alignments" :key="align" type="button" :aria-label="`Align ${align}`"
            :aria-pressed="alignment === align" @click="alignment = align">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16M4 13h16" />
              <path
                :d="align === 'left' ? 'M4 9h10M4 17h10' : align === 'right' ? 'M10 9h10M10 17h10' : 'M7 9h10M7 17h10'" />
            </svg>
          </button>
        </div>
      </div>
    </div>

      <span class="type-tester__info type-tester__hint">Click or tap the text to edit</span>
    </div>

    <textarea ref="editor" v-model="text" @focus="editing = true" @blur="editing = false" class="type-tester__text"
      :style="appearance" aria-label="Text to preview" placeholder="Type here…" spellcheck="false" />
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

  &__toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 860px) minmax(0, 1fr);
    align-items: center;
    gap: 32px;
  }
  &__hint { text-align: right; }

  button {
    font: inherit;
    color: inherit;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 14px;
    border: 0;
    border-radius: var(--radius-full);
    background: #ffffff0a;
    cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease, scale 150ms ease;

    &:active {
      scale: .96;
    }
  }

  svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__controls {
    width: 100%;
    max-width: 860px;
    align-self: center;
    display: grid;
    grid-template-columns: repeat(3, minmax(140px, 1fr)) auto;
    gap: 24px;
    align-items: end;
    padding-bottom: 20px;
    border-bottom: 1px solid #ffffff26;
  }

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__range>span {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  output {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    opacity: .6;
  }

  input[type='range'] {
    appearance: none;
    width: 100%;
    height: 44px;
    margin: 0;
    background: transparent;
    cursor: pointer;

    &::-webkit-slider-runnable-track {
      height: 1px;
      background: #ffffff60;
    }

    &::-moz-range-track {
      height: 1px;
      background: #ffffff60;
    }

    &::-webkit-slider-thumb {
      appearance: none;
      width: 10px;
      height: 10px;
      margin-top: -4.5px;
      border: 0;
      border-radius: 50%;
      background: #ede9e1;
    }

    &::-moz-range-thumb {
      width: 10px;
      height: 10px;
      border: 0;
      border-radius: 50%;
      background: #ede9e1;
    }
  }

  &__formatting {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  button.type-tester__settings-toggle { display: none; }

  &__caps[aria-pressed='true'] {
    background: #ede9e1;
    color: #24221f;
  }

  &__alignment {
    display: flex;
    gap: 2px;
  }

  &__alignment button {
    min-width: 44px;
    padding: 10px;
    background: transparent;
  }

  &__alignment button[aria-pressed='true'] {
    background: #ede9e1;
    color: #24221f;
  }

  @media (hover: hover) {
    &__formatting button:hover {
      background: #daf759;
      color: #24221f;
    }
  }

  &__text {
    display: block;
    flex: 1 0 auto;
    width: 100%;
    min-width: 0;
    min-height: 35svh;
    padding: 4px;
    margin: 0;
    resize: vertical;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font-family: var(--font-sans);
    overflow-wrap: anywhere;
    caret-color: #daf759;

    &:focus {
      outline: none;
      color: #daf759;
    }

    &::placeholder {
      color: currentColor;
      opacity: .35;
    }

    &::selection {
      background: #daf759;
      color: #24221f;
    }
  }

  &__info {
    opacity: .6;
  }

  :is(button, input):focus-visible {
    outline: 2px solid #ede9e1;
    outline-offset: 4px;
  }

}

@media (max-width: 1200px) {
  .type-tester__toolbar { grid-template-columns: 1fr 1fr; gap: 24px; }
  .type-tester__controls { grid-column: 1 / -1; grid-row: 2; justify-self: center; }
}

@media (max-width: 760px) {
  .type-tester { gap: 16px; min-height: 0; }

  .type-tester__toolbar {
    display: contents;
  }

  .type-tester__info {
    order: 3;
    text-align: center;
  }

  .type-tester__hint {
    order: 4;
    text-align: center;
  }

  .type-tester__controls {
    display: none;
    order: 1;
    grid-row: 4;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 0;
    padding-bottom: 16px;
  }

  .type-tester__controls.is-open { display: grid; }

  .type-tester button.type-tester__settings-toggle {
    display: flex;
    order: 0;
    grid-row: 3;
    width: 100%;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: 12px;
    text-align: left;
  }

  .type-tester .type-tester__range {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    padding-inline: 14px 22px;
  }

  .type-tester__range > span {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .type-tester__range output {
    font-size: 11px;
  }

  .type-tester__formatting {
    flex-wrap: nowrap;
    justify-content: space-between;
    margin-top: 0;
  }

  .type-tester__text {
    order: 2;
    flex: none;
    height: clamp(240px, 45svh, 420px);
    min-height: 0;
    padding: 0;
    resize: none;
    overflow-y: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .type-tester button {
    transition: none;
  }
}
</style>
