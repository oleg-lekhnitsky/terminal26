<script setup lang="ts">
import licenseText from '../../public/AB-Terminal-License.txt?raw'
useHead({ title: 'Font license · AB Terminal' })
</script>

<template>
  <main class="font-license">
    <NuxtLink to="/">← Back to AB Terminal</NuxtLink>
    <h1>Font license</h1>
    <p>Personal and commercial use. Desktop, web, and apps. One price, no extra license fees.</p>
    <a href="/AB-Terminal-License.txt" download>Download license</a>
    <div class="font-license__terms">{{ licenseText }}</div>
  </main>
</template>

<style scoped>
.font-license { width: min(100%, 48rem); margin: 0 auto; padding: clamp(24px, 6vw, 64px) 24px; font-family: var(--font-sans); color: var(--color-text); }
h1 { margin: 40px 0 16px; font-size: clamp(32px, 6vw, 56px); line-height: 1.1; }
p, .font-license__terms { line-height: 1.7; }
a { color: inherit; text-underline-offset: 4px; }
.font-license__terms { margin-top: 40px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; }
</style>
