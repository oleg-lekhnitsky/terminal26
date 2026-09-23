import { createHmac, timingSafeEqual } from 'node:crypto'
import { checkoutProducts } from './fontCheckout.ts'

export const downloadLifetime = 180 * 24 * 60 * 60
export interface PaidSession {
  id: string
  mode: string
  payment_status: string
  currency: string | null
  amount_total: number | null
  metadata?: { font_ids?: string } | null
}
export function purchasedFonts(session: PaidSession) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return []
  const products = checkoutProducts(session.metadata?.font_ids?.split(','))
  if (session.currency !== 'usd' || session.amount_total !== products.reduce((sum, product) => sum + product.price * 100, 0)) {
    throw new Error('Order amount does not match the font products.')
  }
  return products
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
