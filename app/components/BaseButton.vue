<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  block?: boolean
  static?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="button"
    :class="[
      `button--${variant}`,
      `button--${size}`,
      { 'button--block': block, 'button--static': static },
    ]"
  >
    <slot />
  </button>
</template>
