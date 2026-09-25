<script setup lang="ts">
import regularFont from '~/assets/fonts/AB_Terminal-Regular.ttf?url'
import boldFont from '~/assets/fonts/AB_Terminal-Bold.ttf?url'

useHead({
  link: [regularFont, boldFont].map(href => ({
    rel: 'preload', href, as: 'font', type: 'font/ttf', crossorigin: 'anonymous' as const,
  })),
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
