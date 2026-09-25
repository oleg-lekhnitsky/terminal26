// Fixed editorial arrangements, listed top-to-bottom within each column.
export const galleryLayouts = {
  1: [[
    'rise', 'alphabet', 'pricing', 'clock', 'poster', 'photo', 'letter', 'tablet',
    'radio', 'carousel', 'truck', 'words', 'ascii', 'tote', 'watch', 'can',
    'gradient', 'city', 'cube', 'flights', 'glyph', 'coffee', 'weather', 'collage',
    'exchange', 'slide', 'pharmacy', 'globe', 'drop', 'wheel', 'numbers', 'poster-maker',
  ]],
  2: [
    ['rise', 'can', 'clock', 'pricing', 'radio', 'words', 'collage', 'letter', 'gradient', 'coffee', 'city', 'flights', 'pharmacy', 'exchange', 'wheel', 'poster'],
    ['alphabet', 'drop', 'photo', 'tablet', 'carousel', 'truck', 'tote', 'watch', 'cube', 'slide', 'glyph', 'weather', 'poster-maker', 'globe', 'ascii', 'numbers'],
  ],
  3: [
    ['rise', 'letter', 'clock', 'poster', 'flights', 'words', 'cube', 'exchange', 'pharmacy', 'photo', 'can'],
    ['alphabet', 'drop', 'pricing', 'radio', 'wheel', 'watch', 'gradient', 'coffee', 'city', 'collage'],
    ['carousel', 'truck', 'tote', 'numbers', 'slide', 'glyph', 'ascii', 'weather', 'globe', 'poster-maker', 'tablet'],
  ],
  4: [
    ['rise', 'can', 'drop', 'flights', 'radio', 'pricing', 'ascii', 'poster'],
    ['clock', 'letter', 'glyph', 'words', 'cube', 'exchange', 'coffee', 'tablet'],
    ['alphabet', 'carousel', 'truck', 'wheel', 'watch', 'gradient', 'pharmacy', 'collage'],
    ['tote', 'slide', 'numbers', 'poster-maker', 'globe', 'city', 'weather', 'photo'],
  ],
} as const

export type GalleryCardId = typeof galleryLayouts[1][0][number]

export function galleryCardStyle(id: GalleryCardId) {
  const style: Record<string, number> = {}
  for (const [count, columns] of Object.entries(galleryLayouts)) {
    columns.forEach((column, index) => {
      const row = (column as readonly string[]).indexOf(id)
      if (row < 0) return
      style[`--column-${count}`] = index + 1
      style[`--order-${count}`] = row * Number(count) + index
    })
  }
  return style
}
