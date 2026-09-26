export interface ExchangeRate {
  rate: number
  date: string
  history?: { rate: number; date: string }[]
}

export function normalizeRateHistory(value: unknown, scale: number, start: string, end: string): { rate: number; date: string }[] {
  if (!Array.isArray(value) || !Number.isFinite(scale) || scale <= 0) throw new Error('Invalid rate history')
  const points = new Map<string, number>()
  for (const row of value) {
    if (!row || typeof row.Date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(row.Date)
      || !Number.isFinite(row.Cur_OfficialRate) || row.Cur_OfficialRate <= 0) continue
    const date = row.Date.slice(0, 10)
    if (!Number.isFinite(Date.parse(date)) || date < start || date > end) continue
    points.set(date, row.Cur_OfficialRate / scale)
  }
  return [...points].sort(([a], [b]) => a.localeCompare(b)).map(([date, rate]) => ({ date, rate }))
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
