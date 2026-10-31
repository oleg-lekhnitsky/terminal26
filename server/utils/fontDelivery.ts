import { createHmac, timingSafeEqual } from 'node:crypto'
import { checkoutProducts } from './fontCheckout.ts'
import { fontProducts } from '../../app/utils/fontShop.ts'

export const downloadLifetime = 180 * 24 * 60 * 60
export interface PaidSession {
  id: string
  mode: string
  payment_status: string
  currency: string | null
  amount_total: number | null
  amount_subtotal?: number | null
  status?: string | null
  total_details?: { amount_discount: number; amount_tax?: number; amount_shipping?: number } | null
  metadata?: { font_ids?: string } | null
}
export function purchasedFonts(session: PaidSession) {
  if (session.mode !== 'payment' || (session.status && session.status !== 'complete')) return []
  const paid = session.payment_status === 'paid'
  const free = session.payment_status === 'no_payment_required'
    && session.status === 'complete' && session.amount_total === 0
  if (!paid && !free) return []
  const ids = session.metadata?.font_ids?.split(',')
  const currentIds = ids?.filter(id => id !== 'test-font')
  // Honor paid historical orders without making the retired test product purchasable.
  const products = [
    ...(currentIds?.length ? checkoutProducts(currentIds) : []),
    ...(ids?.includes('test-font') ? [{ id: 'test-font', label: 'Test font', price: 1 }] : []),
  ]
  if (!products.length) throw new Error('Order contains no font products.')
  const catalogTotal = products.reduce((sum, product) => sum + product.price * 100, 0)
  const hasSubtotal = session.amount_subtotal !== undefined && session.amount_subtotal !== null
  const discount = session.total_details?.amount_discount ?? 0
  // Select the historical price using the pre-discount subtotal, never the
  // discounted total of a new $69 purchase.
  const legacyTotal = catalogTotal - 2900
  const legacyPack = products.some(product => product.id === 'full-pack')
    && (hasSubtotal ? session.amount_subtotal === legacyTotal : session.amount_total === legacyTotal)
  const expectedSubtotal = legacyPack ? legacyTotal : catalogTotal
  const subtotal = hasSubtotal ? session.amount_subtotal! : expectedSubtotal
  const tax = session.total_details?.amount_tax ?? 0
  const shipping = session.total_details?.amount_shipping ?? 0
  const cents = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
  // These values must come from the server's authenticated Stripe retrieval.
  // Current checkout offers no tax/shipping; a discount requires Stripe's subtotal.
  if (session.currency !== 'usd' || !cents(subtotal) || subtotal !== expectedSubtotal
    || !cents(discount) || discount > subtotal || (discount > 0 && !hasSubtotal)
    || !cents(session.amount_total) || session.amount_total !== subtotal - discount
    || tax !== 0 || shipping !== 0 || (free && discount !== subtotal)) {
    throw new Error('Order amount does not match the font products.')
  }
  return legacyPack
    ? products.map(product => product.id === 'full-pack' ? { ...product, price: 40 } : product)
    : products
}
// Full pack owners can download the complete archive or any included style.
export function downloadableFonts(products: readonly { id: string; label: string }[]) {
  if (!products.some(product => product.id === 'full-pack')) return products
  return [...fontProducts, ...products.filter(product => !fontProducts.some(item => item.id === product.id))]
}
export function canDownloadFont(products: readonly { id: string; label: string }[], id: unknown): id is string {
  return typeof id === 'string' && downloadableFonts(products).some(product => product.id === id)
}
export function createDownloadToken(sessionId: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id: sessionId, exp: Math.floor(now / 1000) + downloadLifetime })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}
export function verifyDownloadToken(token: unknown, sessionId: string, secret: string, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, signature] = parts as [string, string]
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return data.id === sessionId && Number.isInteger(data.exp) && data.exp > Math.floor(now / 1000)
  } catch { return false }
}
