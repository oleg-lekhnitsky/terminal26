import { canDownloadFont } from '../utils/fontDelivery'
import { verifiedFontOrder } from '../utils/verifiedFontOrder'

export default defineEventHandler(async event => {
  const order = await verifiedFontOrder(event)
  const productId = getQuery(event).product
  if (!order.paid || !canDownloadFont(order.products, productId)) throw createError({ statusCode: 403, statusMessage: 'This font is not included in your paid order.' })
  const archive = await useStorage('assets:fontDownloads').getItemRaw<Buffer>(`${productId}.zip`)
  if (!archive) throw createError({ statusCode: 503, statusMessage: 'Your font download is temporarily unavailable. Please try again.' })
  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="AB-Terminal-${productId}.zip"`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return archive
})
