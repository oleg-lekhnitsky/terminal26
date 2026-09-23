export interface RadioStation { id: string; name: string; country: string; url: string; homepage: string }
const countries: Record<string, string> = { MA: 'Morocco', EG: 'Egypt', LB: 'Lebanon', TN: 'Tunisia', JO: 'Jordan', AE: 'United Arab Emirates', SA: 'Saudi Arabia', DZ: 'Algeria', IQ: 'Iraq', PS: 'Palestine', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', QA: 'Qatar', LY: 'Libya', SD: 'Sudan', SY: 'Syria', YE: 'Yemen' }
function https(value: unknown) {
  if (typeof value !== 'string') return ''
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '' } catch { return '' }
}
export function radioStations(input: unknown): RadioStation[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const groups = new Map<string, RadioStation[]>()
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const country = countries[raw.countrycode]
    const url = https(raw.url) || https(raw.url_resolved)
    if (!country || raw.lastcheckok !== 1 || raw.hls === 1 || !['MP3', 'AAC', 'AAC+'].includes(raw.codec)
      || !url || /\.(m3u8?|pls)(\?|$)/i.test(url) || seen.has(url)
      || typeof raw.stationuuid !== 'string' || typeof raw.name !== 'string'
      || !/music|pop|hits|jazz|tarab|chaabi|classics|folk|rap|oldies/i.test(String(raw.tags))) continue
    seen.add(url)
    const group = groups.get(country) || []
    group.push({ id: raw.stationuuid, name: raw.name.trim().slice(0, 80), country, url, homepage: https(raw.homepage) })
    groups.set(country, group)
  }
  // Interleave countries so the first few stations span the region.
  const result: RadioStation[] = []
  for (let row = 0; row < 4; row++) for (const group of groups.values()) if (group[row]) result.push(group[row]!)
  return result.slice(0, 24)
}
