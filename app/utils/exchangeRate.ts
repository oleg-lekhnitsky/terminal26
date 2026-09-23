export interface ExchangeRate {
  rate: number
  date: string
}

export function normalizeUsdRate(value: unknown): ExchangeRate {
  const data = value as Record<string, unknown> | null
  if (!data || data.Cur_Abbreviation !== 'USD'
    || typeof data.Cur_Scale !== 'number' || !Number.isFinite(data.Cur_Scale) || data.Cur_Scale <= 0
    || typeof data.Cur_OfficialRate !== 'number' || !Number.isFinite(data.Cur_OfficialRate) || data.Cur_OfficialRate <= 0
    || typeof data.Date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.Date)) {
    throw new Error('Invalid USD rate')
  }
  return { rate: data.Cur_OfficialRate / data.Cur_Scale, date: data.Date.slice(0, 10) }
}
