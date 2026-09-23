import { fontSymbols } from './fontSymbols.ts'
import type { FontVariantId } from './fontVariants.ts'

export interface MicrographicTile { kind: number; rotation: number; glyph: string }

// Repeatable compositions, mirrored across the vertical axis.
export function generateMicrographics(seed: number, variant: FontVariantId = 'bold'): MicrographicTile[] {
  let state = seed >>> 0 || 1
  const next = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const supported = fontSymbols[variant]
  const pool = ['*', '+', '#', '@', '%', '&', '/', '\\', '|', '=', ':', '.', '<', '>', '×', '•', '←', '↑', '→', '↓', '{', '}'].filter(glyph => supported.includes(glyph))
  const vocabulary = Array.from({ length: 4 }, () => pool[Math.floor(next() * pool.length)]!)
  const tiles: MicrographicTile[] = []
  for (let row = 0; row < 6; row++) {
    const half = Array.from({ length: 3 }, () => ({ kind: Math.floor(next() * 3), rotation: Math.floor(next() * 4) * 90, glyph: vocabulary[Math.floor(next() * vocabulary.length)]! }))
    tiles.push(...half, ...half.toReversed().map(tile => ({ ...tile, rotation: (360 - tile.rotation) % 360 })))
  }
  return tiles
}
