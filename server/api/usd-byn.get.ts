import { normalizeUsdRate, normalizeRateHistory } from '../../app/utils/exchangeRate'

const loadRate = defineCachedFunction(async () => {
  try {
    const data = await $fetch<Record<string, unknown>>('https://api.nbrb.by/exrates/rates/USD', {
      query: { parammode: 2 }, timeout: 12000, retry: 1,
    })
    const current = normalizeUsdRate(data)
    const start = new Date(Date.parse(current.date) - 29 * 86400000).toISOString().slice(0, 10)
    // Keep today's rate available even when the historical service is unavailable.
    try {
      if (!Number.isInteger(data.Cur_ID) || Number(data.Cur_ID) <= 0) return current
      const history = await $fetch(`https://api.nbrb.by/exrates/rates/dynamics/${data.Cur_ID}`, {
        query: { startdate: start, enddate: current.date }, timeout: 12000, retry: 1,
      })
      return { ...current, history: normalizeRateHistory(history, Number(data.Cur_Scale), start, current.date) }
    } catch {
      return current
    }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Exchange rate is temporarily unavailable' })
  }
}, {
  name: 'usd-byn-history-v2', maxAge: 600, swr: false,
  validate: entry => (entry.value?.history?.length ?? 0) >= 2,
})

export default defineEventHandler(event => {
  // Only the validated server-side result is cached; retries must reach this handler.
  setHeader(event, 'Cache-Control', 'no-store')
  return loadRate()
})
