import { normalizeMinskFlights, type MinskDepartures } from '../../app/utils/minskFlights'

export default defineCachedEventHandler(async (): Promise<MinskDepartures> => {
  try {
    const feed = await $fetch<unknown>('https://airport.by/en/flights/departure', { timeout: 12000, retry: 1 })
    return { flights: normalizeMinskFlights(feed), updatedAt: new Date().toISOString() }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Departures are temporarily unavailable' })
  }
}, { name: 'minsk-departures', maxAge: 60, swr: false })
