import { fontProducts, addFontToCart, type FontProductId } from '../../app/utils/fontShop.ts'

export function checkoutProducts(input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > fontProducts.length
    || input.some(id => typeof id !== 'string' || !fontProducts.some(product => product.id === id))) {
    throw new Error('Choose a font before checking out.')
  }
  const ids = input.reduce<FontProductId[]>((cart, id) => addFontToCart(cart, id), [])
  return ids.map(id => fontProducts.find(product => product.id === id)!)
}
export function checkoutParameters(input: unknown, origin: string) {
  const products = checkoutProducts(input)
  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    'metadata[font_ids]': products.map(product => product.id).join(','),
  })
  products.forEach((product, index) => {
    const prefix = `line_items[${index}]`
    params.set(`${prefix}[quantity]`, '1')
    params.set(`${prefix}[price_data][currency]`, 'usd')
    params.set(`${prefix}[price_data][unit_amount]`, String(product.price * 100))
    params.set(`${prefix}[price_data][product_data][name]`, `AB Terminal — ${product.label}`)
  })
  return params
}
