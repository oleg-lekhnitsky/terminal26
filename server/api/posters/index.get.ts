import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { posterPrefix, posterStorage } from '../../utils/posterStorage'
import { validPosterId } from '../../utils/posterValidation'
export default defineEventHandler(async event => {
  const storage = posterStorage(event)
  if (!storage) return { configured: false, posters: [], cursor: null }
  const cursor = getQuery(event).cursor
  if (cursor && (typeof cursor !== 'string' || cursor.length > 2048)) throw createError({ statusCode: 400, statusMessage: 'Invalid gallery page.' })
  try {
    const result = await storage.client.send(new ListObjectsV2Command({ Bucket: storage.bucket, Prefix: posterPrefix, MaxKeys: 12, ContinuationToken: cursor ? String(cursor) : undefined }), { abortSignal: AbortSignal.timeout(12000) })
    return { configured: true, posters: (result.Contents || []).flatMap(item => {
      const id = item.Key?.slice(posterPrefix.length).replace(/\.png$/, '')
      return validPosterId(id) ? [{ id, url: `/api/posters/${id}`, createdAt: item.LastModified?.toISOString() || '' }] : []
    }), cursor: result.IsTruncated ? result.NextContinuationToken || null : null }
  } catch { throw createError({ statusCode: 502, statusMessage: 'Could not load the gallery. Please try again.' }) }
})
