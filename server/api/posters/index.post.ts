import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { posterPrefix, posterStorage } from '../../utils/posterStorage'
import { posterByteLimit, validatePosterPng } from '../../utils/posterValidation'
const attempts = new Map<string, number>()
export default defineEventHandler(async event => {
  if (getHeader(event, 'origin') !== String(useRuntimeConfig(event).siteUrl).replace(/\/$/, '')) throw createError({ statusCode: 403, statusMessage: 'Invalid publishing origin.' })
  const storage = posterStorage(event)
  if (!storage) throw createError({ statusCode: 503, statusMessage: 'Publishing is not set up yet. You can still download your poster.' })
  const now = Date.now()
  for (const [key, time] of attempts) if (now - time > 30000) attempts.delete(key)
  const ip = getRequestIP(event) || 'unknown'
  if (attempts.has(ip)) throw createError({ statusCode: 429, statusMessage: 'Wait a moment before publishing another poster.' })
  attempts.set(ip, now)
  if (getHeader(event, 'content-type') !== 'image/png' || Number(getHeader(event, 'content-length') || 0) > posterByteLimit) {
    throw createError({ statusCode: 400, statusMessage: 'Upload a PNG poster under 5 MB.' })
  }
  const reader = getRequestWebStream(event)?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'The poster is empty.' })
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > posterByteLimit) { await reader.cancel(); throw createError({ statusCode: 413, statusMessage: 'The poster is too large.' }) }
    chunks.push(value)
  }
  let body: Buffer
  try { body = validatePosterPng(Buffer.concat(chunks)) }
  catch { throw createError({ statusCode: 400, statusMessage: 'Upload a 960 × 1200 PNG poster under 5 MB.' }) }
  const id = `${String(9999999999999 - now).padStart(13, '0')}-${randomUUID()}`
  try {
    await storage.client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: `${posterPrefix}${id}.png`, Body: body, ContentType: 'image/png', CacheControl: 'public, max-age=3600' }), { abortSignal: AbortSignal.timeout(20000) })
    return { id, url: `/api/posters/${id}`, createdAt: new Date(now).toISOString() }
  } catch { throw createError({ statusCode: 502, statusMessage: 'Could not publish your poster. Your draft is still here.' }) }
})
