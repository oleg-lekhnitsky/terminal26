import { selectCityCameras, type CameraRecord } from '../../app/utils/cityCameras'

export default defineCachedEventHandler(async () => {
  try {
    const records = await $fetch<CameraRecord[]>('https://data.austintexas.gov/resource/b4k4-adkb.json', {
      query: { $limit: 2000, $select: 'camera_id,location_name,camera_status,screenshot_address' },
      timeout: 8000,
      retry: 1,
    })
    if (!Array.isArray(records)) throw new Error('Invalid camera catalog')
    const cameras = selectCityCameras(records)
    if (!cameras.length) throw new Error('No available cameras')
    return { cameras, city: 'Austin', source: 'https://data.mobility.austin.gov/traffic-cameras' }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'City cameras are temporarily unavailable' })
  }
}, { maxAge: 600, name: 'austin-camera-catalog' })
