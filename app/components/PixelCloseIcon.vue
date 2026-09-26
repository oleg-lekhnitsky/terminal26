<template>
  <svg viewBox="0 0 7 7" aria-hidden="true" style="fill: currentColor; stroke: none">
    <rect v-for="index in 7" :key="`down-${index}`" :x="index - 1" :y="index - 1" width="1" height="1" rx=".18" />
    <template v-for="index in 7" :key="`up-${index}`">
      <rect v-if="index !== 4" :x="7 - index" :y="index - 1" width="1" height="1" rx=".18" />
    </template>
  </svg>
</template>
