import { verifiedFontOrder } from '../utils/verifiedFontOrder'
import { createDownloadToken, downloadableFonts } from '../utils/fontDelivery'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const body = await readBody(event)
  const orders = body?.orders ?? []
  if (!Array.isArray(orders) || orders.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Too many saved orders.' })
  }
  const credentials: { session_id: string; token?: string }[] = []
  const cookie = getCookie(event, 'font-checkout-session')
  if (cookie) credentials.push({ session_id: cookie })
  for (const order of orders) {
    if (typeof order?.session_id !== 'string' || typeof order?.token !== 'string') continue
    if (!credentials.some(item => item.session_id === order.session_id)) {
      credentials.push({ session_id: order.session_id, token: order.token })
    }
  }
  const downloads = new Map<string, { id: string; label: string; url: string }>()
  // Bound Stripe requests; an expired saved order must not hide a valid one.
  let unavailable = false
  for (let start = 0; start < credentials.length; start += 3) {
    const results = await Promise.allSettled(credentials.slice(start, start + 3).map(async credential => {
      const order = await verifiedFontOrder(event, credential)
      if (!order.paid) return []
      const token = createDownloadToken(order.id, order.signingKey)
      return downloadableFonts(order.products).map(product => ({
        id: product.id, label: product.label,
        url: `/api/font-download?${new URLSearchParams({ session_id: order.id, token, product: product.id })}`,
      }))
    }))
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const item of result.value) if (!downloads.has(item.id)) downloads.set(item.id, item)
      } else {
        const status = Number(result.reason?.statusCode ?? result.reason?.status)
        if (!status || status >= 500) unavailable = true
      }
    }
  }
  return { downloads: [...downloads.values()], unavailable }
})
