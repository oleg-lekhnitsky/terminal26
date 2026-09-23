export interface CityCamera { id: string; name: string; imageUrl: string }
export interface CameraRecord { camera_id?: string; location_name?: string; camera_status?: string; screenshot_address?: string }

export function selectCityCameras(records: CameraRecord[]): CityCamera[] {
  const preferred = ['51', '52', '109', '133', '127', '102']
  const cameras = new Map<string, CityCamera>()
  for (const record of records) {
    if (record.camera_status !== 'TURNED_ON' || !record.camera_id || !record.location_name || !record.screenshot_address) continue
    try {
      const url = new URL(record.screenshot_address)
      if (url.protocol !== 'https:' || url.hostname !== 'cctv.austinmobility.io' || !/^\/image\/\d+\.jpg$/.test(url.pathname)) continue
      cameras.set(record.camera_id, { id: record.camera_id, name: record.location_name.trim(), imageUrl: url.origin + url.pathname })
    } catch { /* Ignore incomplete catalog entries. */ }
  }
  const ranked = [...cameras.values()].sort((a, b) => {
    const rank = (id: string) => preferred.includes(id) ? preferred.indexOf(id) : preferred.length
    return rank(a.id) - rank(b.id)
  })
  return ranked.slice(0, 12)
}
