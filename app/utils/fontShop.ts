import { fontVariants } from './fontVariants.ts'

export type FontProductId = typeof fontVariants[number]['id'] | 'full-pack'
// USD pricing for individual styles and the complete four-style family.
export const fontProducts = [
  ...fontVariants.map(font => ({ ...font, price: 15, description: '1 font style' })),
  { id: 'full-pack' as const, label: 'Full pack', price: 40, description: 'All 4 font styles', weight: 700, style: 'normal' as const },
]
export function addFontToCart(cart: FontProductId[], product: FontProductId): FontProductId[] {
  if (cart.includes(product)) return cart
  if (product === 'full-pack') return ['full-pack']
  if (cart.includes('full-pack')) return cart
  return [...cart, product]
}
