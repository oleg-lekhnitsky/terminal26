import { normalizeMinskFlights, type MinskDepartures } from '../../app/utils/minskFlights'
import { parseAvionioFlights } from '../utils/avionioFlights'

const avionioDepartures = defineCachedFunction(async (): Promise<MinskDepartures> => {
  const html = await $fetch<string>('https://www.avionio.com/widget/en/msq/departures', { timeout: 10000, retry: 0, responseType: 'text' })
  return { flights: parseAvionioFlights(html), updatedAt: new Date().toISOString(), source: 'avionio' }
}, { name: 'avionio-minsk-departures', maxAge: 300, swr: false })

export default defineCachedEventHandler(async (): Promise<MinskDepartures> => {
  try {
    const feed = await $fetch<unknown>('https://airport.by/en/flights/departure', { timeout: 5000, retry: 0 })
    return { flights: normalizeMinskFlights(feed), updatedAt: new Date().toISOString(), source: 'airport' }
  } catch (error) {
    console.warn('[minsk-flights] Airport feed failed', error instanceof Error ? error.message : 'Unknown error')
    try {
      return await avionioDepartures()
    } catch (fallbackError) {
      console.warn('[minsk-flights] Avionio fallback failed', fallbackError instanceof Error ? fallbackError.message : 'Unknown error')
      throw createError({ statusCode: 502, statusMessage: 'Departures are temporarily unavailable' })
    }
  }
}, { name: 'minsk-departures', maxAge: 60, swr: false })
