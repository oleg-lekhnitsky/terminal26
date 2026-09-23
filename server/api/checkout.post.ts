import { checkoutParameters } from '../utils/fontCheckout'
import { stripeKeyProblem } from '../utils/stripeKey'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  const origin = String(config.siteUrl).replace(/\/$/, '')
  if (getHeader(event, 'origin') !== origin) throw createError({ statusCode: 403, statusMessage: 'Invalid checkout origin.' })
  const body = await readBody(event)
  let params: URLSearchParams
  try { params = checkoutParameters(body?.items, origin) }
  catch { throw createError({ statusCode: 400, statusMessage: 'Choose a valid font before checking out.' }) }
  const secretKey = String(config.stripeSecretKey).trim()
  const keyProblem = stripeKeyProblem(secretKey)
  if (keyProblem) {
    console.error(`[checkout] ${keyProblem}`)
    throw createError({ statusCode: 503, statusMessage: import.meta.dev ? keyProblem : 'Checkout is not available yet. Your cart is saved.' })
  }
  try {
    const session = await $fetch<{ id: string; url: string }>('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(), retry: 0, timeout: 15000,
    })
    if (!session.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Missing checkout URL')
    setCookie(event, 'font-checkout-session', session.id, { httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 180 * 86400 })
    return { url: session.url }
  } catch { throw createError({ statusCode: 502, statusMessage: 'Could not open checkout. Please try again.' }) }
})
