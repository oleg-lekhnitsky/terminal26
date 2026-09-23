import { normalizeUsdRate } from '../../app/utils/exchangeRate'

export default defineCachedEventHandler(async () => {
  try {
    const data = await $fetch('https://api.nbrb.by/exrates/rates/USD', {
      query: { parammode: 2 }, timeout: 12000, retry: 1,
    })
    return normalizeUsdRate(data)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Exchange rate is temporarily unavailable' })
  }
}, { name: 'usd-byn', maxAge: 600, swr: false })
