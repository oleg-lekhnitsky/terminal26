import { radioStations } from '../../app/utils/arabicRadio'
import fallback from '../data/arabic-radio.json'

export default defineCachedEventHandler(async () => {
  for (const host of ['de1.api.radio-browser.info', 'nl1.api.radio-browser.info']) {
    try {
      const raw = await $fetch(`https://${host}/json/stations/search`, {
        query: { language: 'arabic', hidebroken: true, is_https: true, order: 'clickcount', reverse: true, limit: 150 },
        headers: { 'User-Agent': 'ABTerminalRadio/1.0' }, timeout: 6000, retry: 0,
      })
      const stations = radioStations(raw)
      if (stations.length) return { stations, cachedDirectory: false }
    } catch { /* Try the next public directory mirror. */ }
  }
  return { stations: radioStations(fallback), cachedDirectory: true }
}, { maxAge: 3600, name: 'arabic-music-radio-v1' })
