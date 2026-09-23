import { GetObjectCommand } from '@aws-sdk/client-s3'
import { posterPrefix, posterStorage } from '../../utils/posterStorage'
import { validPosterId } from '../../utils/posterValidation'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!validPosterId(id)) throw createError({ statusCode: 404, statusMessage: 'Poster not found.' })
  const storage = posterStorage(event)
  if (!storage) throw createError({ statusCode: 503, statusMessage: 'Gallery unavailable.' })
  try {
    const image = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: `${posterPrefix}${id}.png` }), { abortSignal: AbortSignal.timeout(12000) })
    if (!image.Body) throw new Error('Missing poster')
    setHeaders(event, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" })
    return await image.Body.transformToByteArray()
  } catch (error: any) {
    throw createError({ statusCode: error?.$metadata?.httpStatusCode === 404 ? 404 : 502, statusMessage: 'Poster unavailable.' })
  }
})
