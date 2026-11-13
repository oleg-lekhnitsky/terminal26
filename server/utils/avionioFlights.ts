import type { MinskFlight } from '../../app/utils/minskFlights.ts'

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
    const value = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
    return value <= 0x10ffff ? String.fromCodePoint(value) : ''
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[name] ?? '').replace(/\s+/g, ' ').trim()
}

// Parse only the board's known row structure. Block pages and layout changes
// must fail instead of being displayed as an empty departures board.
export function parseAvionioFlights(html: string, now = Date.now()): MinskFlight[] {
  const flights: MinskFlight[] = []
  const seen = new Set<string>()
  let validRows = 0
  for (const match of html.matchAll(/<tr\b[^>]*class="([^"]*\btt-row\b[^"]*)"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const [, classes, row] = match
    if (/\btt-child\b/.test(classes)) continue
    const cells = new Map<string, string>()
    for (const cell of row.matchAll(/<td\b[^>]*class="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi)) {
      for (const name of cell[1].split(/\s+/)) cells.set(name, cell[2])
    }
    const flightCell = cells.get('tt-f') ?? ''
    // Avionio encodes the airport's wall clock as a UTC-shaped timestamp.
    // Minsk stays at UTC+03:00, so convert it to an actual instant.
    const timestamp = Number(/\bdata-ts="(\d+)"/.exec(flightCell)?.[1]) - 3 * 3600000
    const flight = plainText(flightCell)
    const destination = plainText(cells.get('tt-ap') ?? '')
    const destinationCode = plainText(cells.get('tt-i') ?? '')
    const status = plainText(cells.get('tt-s') ?? '')
    if (!Number.isFinite(timestamp) || timestamp < 1e12 || timestamp > 8.64e15 || !flight || !destination || !/^[A-Z]{3}$/.test(destinationCode) || !status) continue
    validRows++
    if (/\b(departed|airborne|landed|en-route)\b/i.test(`${classes} ${status}`)) continue
    if (timestamp < now - 2 * 3600000 || timestamp > now + 24 * 3600000) continue
    const id = `avionio-${flight}-${timestamp}`
    if (seen.has(id)) continue
    seen.add(id)
    flights.push({ id, flight, destination, destinationCode, scheduled: new Date(timestamp).toISOString(), status,
      cancelled: /\bcancelled\b/i.test(`${classes} ${status}`), delayed: /\bdelayed\b/i.test(`${classes} ${status}`) })
  }
  if (!validRows) throw new Error('Invalid Avionio departures board')
  return flights.sort((a, b) => Date.parse(a.scheduled) - Date.parse(b.scheduled)).slice(0, 16)
}
