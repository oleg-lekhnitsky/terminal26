import { fontVariants } from './fontVariants.ts'

export type FontProductId = typeof fontVariants[number]['id'] | 'full-pack' | 'test-font'
// USD pricing for individual styles and the complete four-style family.
export const fontProducts = [
  { id: 'test-font' as const, label: 'Test font', price: 1, description: 'Checkout test', weight: 400, style: 'normal' as const },
  ...fontVariants.map(font => ({ ...font, price: 15, description: '1 font style' })),
  { id: 'full-pack' as const, label: 'Full pack', price: 40, description: 'All 4 font styles', weight: 700, style: 'normal' as const },
]
export function addFontToCart(cart: FontProductId[], product: FontProductId): FontProductId[] {
  if (cart.includes(product)) return cart
  if (product === 'full-pack') return [...cart.filter(id => id === 'test-font'), 'full-pack']
  if (cart.includes('full-pack') && product !== 'test-font') return cart
  return [...cart, product]
}
