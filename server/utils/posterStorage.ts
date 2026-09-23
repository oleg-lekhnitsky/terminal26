import { S3Client } from '@aws-sdk/client-s3'
import type { H3Event } from 'h3'
export const posterPrefix = 'community-posters/v1/'
let client: S3Client | undefined
let identity = ''
export function posterStorage(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey || !config.r2Bucket) return null
  const nextIdentity = [config.r2AccountId, config.r2AccessKeyId, config.r2SecretAccessKey].join(':')
  if (!client || identity !== nextIdentity) {
    client?.destroy()
    client = new S3Client({
      region: 'auto', endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: String(config.r2AccessKeyId), secretAccessKey: String(config.r2SecretAccessKey) },
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED', maxAttempts: 2,
    })
    identity = nextIdentity
  }
  return { client, bucket: String(config.r2Bucket) }
}
