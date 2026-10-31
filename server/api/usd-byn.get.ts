import { fetchUsdByn } from '../utils/usdByn'
import type { ExchangeRate } from '../../app/utils/exchangeRate'

const loadRate = defineCachedFunction(async () => {
  const storage = useStorage('cache')
  const key = 'usd-byn:last-success'
  try {
    const current = await fetchUsdByn($fetch)
    // A storage failure must not hide a successful upstream response.
    await storage.setItem(key, current).catch(() => {})
    return current
  } catch {
    const saved = await storage.getItem<ExchangeRate>(key).catch(() => null)
    const age = saved ? Date.now() - Date.parse(saved.date) : Infinity
    if (saved && Number.isFinite(saved.rate) && saved.rate > 0 && age >= 0 && age <= 3 * 86400000) {
      return { ...saved, stale: true }
    }
    throw createError({ statusCode: 502, statusMessage: 'Exchange rate is temporarily unavailable' })
  }
}, {
  name: 'usd-byn-history-v3', maxAge: 600, swr: false,
  // A valid current rate is useful even without history. Retry stale results sooner.
  validate: entry => Number.isFinite(entry.value?.rate) && entry.value.rate > 0 && !entry.value.stale,
})

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store')
  return loadRate()
})
