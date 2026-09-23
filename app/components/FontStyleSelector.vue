<script setup lang="ts">
import { motionSystem } from '~/utils/textRenderer'
import type { FontVariantId } from '~/utils/fontVariants'

const { selectedFont, activeFont, fontVariants } = useFontSelection()
const host = useTemplateRef('host')
const trigger = useTemplateRef('trigger')
const menu = useTemplateRef('menu')
const open = ref(false)
const menuId = useId()

function choose(id: FontVariantId) {
  selectedFont.value = id
  open.value = false
  trigger.value?.focus()
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    menu.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
  }
}

function outside(event: PointerEvent) {
  if (!host.value?.contains(event.target as Node)) open.value = false
}

function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    open.value = false
    trigger.value?.focus()
  }
}

function navigate(event: KeyboardEvent) {
  const buttons = Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  let next = index
  if (event.key === 'ArrowDown') next = (index + 1) % buttons.length
  else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = buttons.length - 1
  else return
  event.preventDefault()
  buttons[next]?.focus()
}

function focusout(event: FocusEvent) {
  if (!host.value?.contains(event.relatedTarget as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', keydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', keydown)
})
</script>

<template>
  <div ref="host" class="font-selector" :style="{ '--selector-duration': `${motionSystem.enter / 4}s` }" @focusout="focusout">
    <div class="font-selector__desktop" role="group" aria-label="Font style">
      <button v-for="font in fontVariants" :key="font.id" type="button" class="font-selector__button" :aria-pressed="selectedFont === font.id" :style="{ fontWeight: font.weight, fontStyle: font.style }" @click="selectedFont = font.id">{{ font.label }}</button>
    </div>
    <div class="font-selector__mobile">
      <button ref="trigger" type="button" class="font-selector__button font-selector__trigger" :aria-expanded="open" :aria-controls="menuId" :aria-label="`Font style: ${activeFont.label}`" :style="{ fontWeight: activeFont.weight, fontStyle: activeFont.style }" @click="toggle">
        {{ activeFont.label }}
        <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ 'is-open': open }"><path d="m4 10 4-4 4 4" /></svg>
      </button>
      <Transition name="font-menu">
        <div v-if="open" :id="menuId" ref="menu" class="font-selector__menu" role="group" aria-label="Font style" @keydown="navigate">
          <button v-for="font in fontVariants" :key="font.id" type="button" class="font-selector__option" :aria-pressed="selectedFont === font.id" :style="{ fontWeight: font.weight, fontStyle: font.style }" @click="choose(font.id)">{{ font.label }}<span v-if="selectedFont === font.id" aria-hidden="true">✓</span></button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.font-selector {
  position: fixed;
  z-index: var(--z-overlay);
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 24px);
  color: #161616;
  font-family: var(--font-sans);
  font-size: 12px;

  &__desktop { display: flex; gap: 8px; }
  &__mobile { display: none; position: relative; }

  &__button, &__option {
    font-family: inherit;
    font-size: inherit;
    line-height: 1;
    cursor: pointer;
    color: inherit;
    background: #f7f6f2;
    transition: background-color var(--selector-duration) var(--ease-flow);
    &:focus-visible { outline: 2px solid #f2df64; outline-offset: 3px; }
    @media (hover: hover) { &:hover { background: #f2df64; } }
  }

  &__button {
    min-height: 46px;
    padding: 16px;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 20px;
    &[aria-pressed='true'] { border-color: #161616; }
  }

  &__trigger {
    min-width: 160px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border-color: #161616;
    svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; transition: transform var(--selector-duration) var(--ease-flow); }
    .is-open { transform: rotate(180deg); }
  }

  &__menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 210px;
    max-width: calc(100vw - 24px);
    padding: 4px;
    border-radius: 16px;
    border: 1px solid #161616;
    background: #f7f6f2;
  }

  &__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    text-align: left;
    &[aria-pressed='true'] { background: #efeee7; }
  }
}

.font-menu-enter-active, .font-menu-leave-active { transition: opacity var(--selector-duration) var(--ease-flow), transform var(--selector-duration) var(--ease-flow); }
.font-menu-enter-from, .font-menu-leave-to { opacity: 0; transform: translate(-50%, 8px); }

@media (max-width: 768px) {
  .font-selector__desktop { display: none; }
  .font-selector__mobile { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .font-selector *, .font-menu-enter-active, .font-menu-leave-active { transition: none; }
}
</style>
