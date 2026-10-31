import { normalizeUsdRate, normalizeRateHistory, type ExchangeRate } from '../../app/utils/exchangeRate.ts'

const endpoints = ['https://api.nbrb.by/exrates', 'https://www.nbrb.by/api/exrates']
type FetchRate = (url: string, options: { query: Record<string, string | number>; timeout: number; retry: number }) => Promise<unknown>

export async function fetchUsdByn(fetcher: FetchRate): Promise<ExchangeRate> {
  let failure: unknown
  for (const base of endpoints) {
    try {
      const data = await fetcher(`${base}/rates/USD`, {
        query: { parammode: 2 }, timeout: 5000, retry: 0,
      }) as Record<string, unknown>
      const current = normalizeUsdRate(data)
      if (!Number.isInteger(data.Cur_ID) || Number(data.Cur_ID) <= 0) return current
      const start = new Date(Date.parse(current.date) - 29 * 86400000).toISOString().slice(0, 10)
      try {
        const history = await fetcher(`${base}/rates/dynamics/${data.Cur_ID}`, {
          query: { startdate: start, enddate: current.date }, timeout: 5000, retry: 0,
        })
        return { ...current, history: normalizeRateHistory(history, Number(data.Cur_Scale), start, current.date) }
      } catch { return current }
    } catch (error) { failure = error }
  }
  throw failure
}
