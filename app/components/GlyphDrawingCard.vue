<script setup lang="ts">
const columns = 14
const rows = 16
const storageKey = 'terminal-glyph-drawing-v1'
const grid = useTemplateRef('grid')
const flower = [
  '..............',
  '......##......',
  '.....####.....',
  '..##.####.##..',
  '.#####..#####.',
  '.#####..#####.',
  '..##.####.##..',
  '.....####.....',
  '......##......',
  '......##......',
  '...##.##......',
  '..######......',
  '...#####......',
  '......##......',
  '......##......',
  '..............',
]
const cells = ref(flower.flatMap(row => Array.from(row, pixel => pixel === '#')))
const history = ref<boolean[][]>([])
const focused = ref(0)
let pointer: number | undefined
let painting = true
let previousCell: number | undefined
let beforeStroke: boolean[] | undefined
let loaded = false

function remember(snapshot: boolean[]) {
  if (snapshot.every((value, index) => value === cells.value[index])) return
  history.value = [...history.value.slice(-19), snapshot]
}
function hit(event: PointerEvent) {
  if (!grid.value) return undefined
  const bounds = grid.value.getBoundingClientRect()
  const x = Math.floor((event.clientX - bounds.left) / bounds.width * columns)
  const y = Math.floor((event.clientY - bounds.top) / bounds.height * rows)
  return x >= 0 && x < columns && y >= 0 && y < rows ? y * columns + x : undefined
}
function paint(index: number) {
  const start = previousCell ?? index
  const x0 = start % columns, y0 = Math.floor(start / columns)
  const dx = index % columns - x0, dy = Math.floor(index / columns) - y0
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1)
  for (let step = 0; step <= steps; step++) {
    const x = Math.round(x0 + dx * step / steps)
    const y = Math.round(y0 + dy * step / steps)
    cells.value[y * columns + x] = painting
  }
  previousCell = index
}
function begin(event: PointerEvent) {
  if (pointer !== undefined || event.button !== 0) return
  const index = hit(event)
  if (index === undefined) return
  event.preventDefault()
  pointer = event.pointerId
  beforeStroke = [...cells.value]
  painting = !cells.value[index]
  focused.value = index
  grid.value?.setPointerCapture(event.pointerId)
  paint(index)
}
function move(event: PointerEvent) {
  if (event.pointerId !== pointer) return
  const index = hit(event)
  if (index === undefined) { previousCell = undefined; return }
  paint(index)
}
function finish(event: PointerEvent) {
  if (event.pointerId !== pointer) return
  if (beforeStroke) remember(beforeStroke)
  pointer = undefined
  previousCell = undefined
  beforeStroke = undefined
  if (grid.value?.hasPointerCapture(event.pointerId)) grid.value.releasePointerCapture(event.pointerId)
}
function toggle(index: number, event: MouseEvent) {
  // Pointer drawing is handled above; clicks with detail 0 cover keyboard/AT.
  if (event.detail !== 0) return
  const snapshot = [...cells.value]
  cells.value[index] = !cells.value[index]
  remember(snapshot)
}
function navigate(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }
  const offset = offsets[event.key]
  if (offset === undefined) return
  event.preventDefault()
  focused.value = Math.max(0, Math.min(cells.value.length - 1, index + offset))
  grid.value?.querySelectorAll('button')[focused.value]?.focus()
}
function clear() {
  const snapshot = [...cells.value]
  cells.value = cells.value.map(() => false)
  remember(snapshot)
}
function undo() {
  const snapshot = history.value.pop()
  if (snapshot) cells.value = snapshot
}
function download() {
  const pixels = cells.value.flatMap((active, index) => active
    ? [`<rect x="${index % columns * 24}" y="${Math.floor(index / columns) * 24}" width="22" height="22" rx="4"/>`] : []).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns * 24} ${rows * 24}" fill="#ffbd13">${pixels}</svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'terminal-glyph.svg'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(() => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (Array.isArray(saved) && saved.length === columns * rows && saved.every(value => typeof value === 'boolean')) cells.value = saved
  } catch { /* Drawing remains available when storage is unavailable. */ }
  loaded = true
})
watch(cells, value => {
  if (!loaded) return
  try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* Keep the current drawing in memory. */ }
}, { deep: true })
</script>

<template>
  <figure class="glyph-pin">
    <div class="glyph-pin__art">
      <div ref="grid" class="glyph-pin__grid" role="group" aria-label="Glyph drawing grid. Drag to draw or erase. Use arrow keys to move and space to toggle."
        @pointerdown="begin" @pointermove="move" @pointerup="finish" @pointercancel="finish" @lostpointercapture="finish">
        <button v-for="(active, index) in cells" :key="index" type="button" class="glyph-pin__cell" :class="{ 'is-on': active }"
          :aria-label="`Row ${Math.floor(index / columns) + 1}, column ${index % columns + 1}`" :aria-pressed="active" :tabindex="index === focused ? 0 : -1"
          @focus="focused = index" @click="toggle(index, $event)" @keydown="navigate($event, index)" />
      </div>
      <div class="glyph-pin__tools">
        <button type="button" :disabled="!history.length" @click="undo">Undo</button>
        <button type="button" :disabled="!cells.some(Boolean)" @click="clear">Clear</button>
        <button type="button" :disabled="!cells.some(Boolean)" @click="download">Save SVG</button>
      </div>
    </div>
    <figcaption>Glyph maker</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.glyph-pin {
  margin: 0 0 var(--space-6); break-inside: avoid;
  &__art { container-type: inline-size; padding: 7%; border-radius: var(--radius-xl); background: #101010; color: #ffbd13; }
  &__grid { display: grid; grid-template-columns: repeat(14, 1fr); gap: 3px; touch-action: none; user-select: none; }
  &__cell { aspect-ratio: 1; min-width: 0; padding: 0; border: 0; border-radius: 18%; background: #242424; cursor: crosshair; }
  &__cell.is-on { background: #ffbd13; }
  &__cell:focus-visible { outline: 2px solid #fff3ce; outline-offset: 1px; z-index: 1; }
  &__tools { display: flex; align-items: center; gap: 3cqw; margin-top: 5cqw; }
  &__tools button { min-height: 44px; padding: .5em .25em; background: transparent; border: 0; color: inherit; font-family: var(--font-sans); font-weight: var(--specimen-weight, 700); font-style: var(--specimen-style, normal); font-size: 3.7cqw; cursor: pointer; }
  &__tools button:last-child { margin-left: auto; }
  &__tools button:disabled { opacity: .35; cursor: default; }
  &__tools button:active:not(:disabled) { transform: scale(.96); }
  &__tools button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  figcaption { padding: var(--space-3) var(--space-2) 0; font-size: var(--text-sm); color: var(--color-text); }
}
</style>
