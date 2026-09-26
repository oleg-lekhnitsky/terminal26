<script setup lang="ts">
const props = defineProps<{ kind: 'play' | 'pause' | 'previous' | 'next' }>()
const pixels = computed(() => {
  const result: { x: number; y: number }[] = []
  for (let y = 1; y < 8; y++) {
    if (props.kind === 'pause') {
      for (const x of [1, 2, 6, 7]) result.push({ x, y })
    } else {
      const start = props.kind === 'play' ? 1 : 0
      const width = 7 - 2 * Math.abs(4 - y)
      for (let x = start; x < start + width; x++) result.push({ x, y })
      if (props.kind !== 'play') result.push({ x: 8, y })
    }
  }
  return result
})
</script>

<template>
  <svg viewBox="0 0 9 9" aria-hidden="true" style="fill: currentColor; stroke: none">
    <g :transform="kind === 'previous' ? 'translate(9 0) scale(-1 1)' : undefined">
      <rect v-for="pixel in pixels" :key="`${pixel.x}-${pixel.y}`" :x="pixel.x" :y="pixel.y" width="1" height="1" rx=".18" />
    </g>
  </svg>
</template>
