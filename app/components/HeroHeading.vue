<script setup lang="ts">
const heading = useTemplateRef('heading')
const lines = ['AB Terminal', 'Typeface']
const palette = ['#daf759', '#ff6500', '#f652e3']
let frame = 0
let motionQuery: MediaQueryList | undefined

function reset() {
  cancelAnimationFrame(frame)
  frame = 0
  heading.value?.querySelectorAll<HTMLElement>('.hero-heading__letter').forEach(letter => {
    letter.style.removeProperty('transform')
    letter.style.removeProperty('color')
  })
}

function react(event: PointerEvent) {
  if (motionQuery?.matches) return
  const { clientX, clientY } = event
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    frame = 0
    const rows = Array.from(heading.value?.querySelectorAll<HTMLElement>('.hero-heading__line') ?? [])
    const measuredRows = rows.map(row => ({ row, bounds: row.getBoundingClientRect() }))
    const activeRow = measuredRows.find(({ bounds }) => clientY >= bounds.top && clientY < bounds.bottom)?.row
    // Read untransformed positions first so moving letters never chase their own bounds.
    const updates = measuredRows.flatMap(({ row, bounds }) => {
      const radius = Math.max(40, Math.min(120, bounds.height * .9))
      return Array.from(row.querySelectorAll<HTMLElement>('.hero-heading__letter'), (letter, index) => {
        const x = bounds.left + letter.offsetLeft + letter.offsetWidth / 2
        const y = bounds.top + letter.offsetTop + letter.offsetHeight / 2
        const distance = Math.hypot(clientX - x, clientY - y)
        const influence = row === activeRow ? Math.pow(Math.max(0, 1 - distance / radius), 2) : 0
        return { letter, index, influence, tilt: (x - clientX) / radius, lift: Math.min(18, bounds.height * .16) }
      })
    })
    updates.forEach(({ letter, index, influence, tilt, lift }) => {
      letter.style.transform = `translateY(${-lift * influence}px) rotate(${tilt * influence * 16}deg) scale(${1 + influence * .12})`
      letter.style.color = influence > .08 ? palette[index % palette.length]! : ''
    })
  })
}

function release(event: PointerEvent) {
  if (event.pointerType !== 'mouse') reset()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', reset)
  window.addEventListener('blur', reset)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  motionQuery?.removeEventListener('change', reset)
  window.removeEventListener('blur', reset)
})
</script>

<template>
  <h1 ref="heading" class="hero-heading" aria-label="AB Terminal Typeface"
    @pointermove="react" @pointerdown="react" @pointerleave="reset"
    @pointerup="release" @pointercancel="reset">
    <span v-for="line in lines" :key="line" class="hero-heading__line" aria-hidden="true">
      <span v-for="(letter, index) in line" :key="index" class="hero-heading__letter">{{ letter === ' ' ? '\u00a0' : letter }}</span>
    </span>
  </h1>
</template>

<style scoped>
.hero-heading__line { display: block; position: relative; white-space: nowrap; }
.hero-heading__letter {
  display: inline-block;
  transform-origin: 50% 75%;
  transition: transform 150ms ease-out, color 150ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .hero-heading__letter { transition: none; transform: none !important; }
}
</style>
