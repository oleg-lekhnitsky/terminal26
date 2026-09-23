export const posterByteLimit = 5 * 1024 * 1024
export function validPosterId(id: unknown): id is string {
  return typeof id === 'string' && /^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
}
export function validatePosterPng(bytes: Uint8Array) {
  const data = Buffer.from(bytes)
  if (data.length > posterByteLimit || data.length < 45 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || data.toString('ascii', 12, 16) !== 'IHDR' || data.readUInt32BE(16) !== 960 || data.readUInt32BE(20) !== 1200
    || data.toString('ascii', data.length - 8, data.length - 4) !== 'IEND') {
    throw new Error('Upload a 960 × 1200 PNG poster under 5 MB.')
  }
  return data
}
