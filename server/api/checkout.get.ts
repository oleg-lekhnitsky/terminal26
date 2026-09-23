import { createDownloadToken } from '../utils/fontDelivery'
import { verifiedFontOrder } from '../utils/verifiedFontOrder'

export default defineEventHandler(async event => {
  const order = await verifiedFontOrder(event)
  if (!order.paid) return { paid: false, downloads: [], restoreUrl: '' }
  const token = createDownloadToken(order.id, order.signingKey)
  const query = new URLSearchParams({ session_id: order.id, token })
  return {
    paid: true,
    downloads: order.products.map(product => ({
      id: product.id, label: product.label,
      url: `/api/font-download?${query}&product=${encodeURIComponent(product.id)}`,
    })),
    restoreUrl: `/checkout?${query}`,
  }
})
