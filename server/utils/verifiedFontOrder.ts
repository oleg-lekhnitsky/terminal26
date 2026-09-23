import { stripeFailure } from './stripeFailure'
import type { H3Event } from 'h3'
import { stripeKeyProblem } from './stripeKey'
import { purchasedFonts, verifyDownloadToken, type PaidSession } from './fontDelivery'

export async function verifiedFontOrder(event: H3Event) {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const query = getQuery(event)
  const id = query.session_id || getCookie(event, 'font-checkout-session')
  if (typeof id !== 'string' || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Open the download link for your order.' })
  }
  const config = useRuntimeConfig(event)
  const secretKey = String(config.stripeSecretKey).trim()
  if (stripeKeyProblem(secretKey)) throw createError({ statusCode: 503, statusMessage: 'Order verification is unavailable.' })
  const signingKey = String(config.fontDownloadSecret || secretKey)
  if (getCookie(event, 'font-checkout-session') !== id && !verifyDownloadToken(query.token, id, signingKey)) {
    throw createError({ statusCode: 403, statusMessage: 'This download link has expired or is invalid.' })
  }
  let session: PaidSession
  try {
    session = await $fetch<PaidSession>(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${secretKey}` }, timeout: 10000, retry: 0,
    })
  } catch (error) {
    console.error('[checkout] Stripe payment verification failed', stripeFailure(error))
    throw createError({ statusCode: 502, statusMessage: 'Could not verify payment. Please try again.' })
  }
  let products
  try { products = purchasedFonts(session) }
  catch { throw createError({ statusCode: 409, statusMessage: 'The order does not match the font catalog.' }) }
  return { id, products, paid: session.payment_status === 'paid' && products.length > 0, signingKey }
}
