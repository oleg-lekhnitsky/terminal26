export interface MinskFlight {
  id: string
  flight: string
  destination: string
  scheduled: string
  estimated?: string
  status: string
  gate?: string
  delayed: boolean
  cancelled: boolean
}
export interface MinskDepartures { flights: MinskFlight[]; updatedAt: string }

export function normalizeMinskFlights(input: unknown, now = Date.now()): MinskFlight[] {
  if (!Array.isArray(input)) throw new Error('Invalid airport feed')
  const flights: MinskFlight[] = []
  const seen = new Set<string>()
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const scheduled = typeof row.plan === 'string' ? Date.parse(row.plan) : NaN
    const estimate = typeof row.DelayedTo === 'string' ? Date.parse(row.DelayedTo) : NaN
    if (!Number.isFinite(scheduled) || typeof row.flight !== 'string' || typeof row.airport?.title !== 'string') continue
    if (row.status?.id === 'airborne' || row.fact) continue
    const effective = Number.isFinite(estimate) ? Math.max(scheduled, estimate) : scheduled
    if (effective < now - 2 * 3600000 || scheduled > now + 24 * 3600000) continue
    const id = String(row.flight_id ?? `${row.flight}-${row.plan}`)
    if (seen.has(id)) continue
    seen.add(id)
    const cancelled = row.isCanceled === true
    const delayed = row.isDelayed === true
    const status = cancelled ? 'Cancelled' : (typeof row.status?.title === 'string' && row.status.title.trim()) || (delayed ? 'Delayed' : 'Scheduled')
    flights.push({
      id, flight: row.flight.trim(), destination: row.airport.title.trim(), scheduled: row.plan,
      estimated: Number.isFinite(estimate) ? row.DelayedTo : undefined,
      status, cancelled, delayed,
      gate: Array.isArray(row.numbers_gate) ? row.numbers_gate.filter((gate: unknown) => typeof gate === 'string' && gate.trim()).join(' / ') || undefined : undefined,
    })
  }
  return flights.sort((a, b) => Date.parse(a.estimated ?? a.scheduled) - Date.parse(b.estimated ?? b.scheduled)).slice(0, 16)
}
