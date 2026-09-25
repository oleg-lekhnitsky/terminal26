<script setup lang="ts">
import { motionSystem } from '~/utils/textRenderer'

const { activeFont } = useFontSelection()
const alphabets = [
  { label: 'LATIN', text: 'Aa Bb Cc Dd\nEe Ff Gg Hh\nIi Jj Kk Ll\nMm Nn Oo Pp\nQq Rr Ss Tt\nUu Vv Ww\nXx Yy Zz' },
  { label: 'CYRILLIC', text: 'Аа Бб Вв Гг\nДд Ее Ёё Жж\nЗз Ии Йй Кк\nЛл Мм Нн Оо\nПп Рр Сс Тт\nУу Фф Хх Цц\nЧч Шш Щщ\nЪъ Ыы Ьь\nЭэ Юю Яя' },
] as const
const alphabetIndex = ref(0)
const alphabet = computed(() => alphabets[alphabetIndex.value]!)
function nextAlphabet() { alphabetIndex.value = (alphabetIndex.value + 1) % alphabets.length }
</script>

<template>
  <figure class="alphabet-pin">
    <div class="alphabet-pin__art">
      <WebGLText class="alphabet-pin__letters" :text="alphabet.text" preset="poster" preserve-case stagger-by-words
        :duration="motionSystem.enter / 2" :stagger="motionSystem.stagger / 2" :hold="2.5" :line-height="0.95"
        color="#642a46" :font-weight="activeFont.weight" :font-style="activeFont.style" @cycle-complete="nextAlphabet" loop />
      <div class="alphabet-pin__micro alphabet-pin__micro--top"><span>AB TERMINAL</span><span>{{ alphabet.label }}</span></div>
      <div class="alphabet-pin__micro alphabet-pin__micro--bottom"><span>{{ activeFont.label }}</span><span>LETTERS</span></div>
    </div>
    <figcaption>Alphabet</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.alphabet-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;
  &__art {
    position: relative;
    container-type: inline-size;
    isolation: isolate;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border-radius: var(--radius-xl);
    clip-path: inset(0 round var(--radius-xl));
    background: #f652e3;
    color: #642a46;
  }
  &__letters { position: absolute; inset: 0; --webgl-text-height: 100%; }
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
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
</style>
