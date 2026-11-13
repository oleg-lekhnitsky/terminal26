import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseAvionioFlights } from '../server/utils/avionioFlights.ts'

const html = readFileSync(new URL('./fixtures/avionio-msq.html', import.meta.url), 'utf8')
const now = Date.parse('2026-11-13T13:30:00Z')

test('parses live board structure, timestamps and exact airport codes; skips codeshares', () => {
  const flights = parseAvionioFlights(html, now)
  assert.equal(flights.length, 2)
  assert.equal(flights[0].flight, 'B2955')
  assert.equal(flights[0].destinationCode, 'DME')
  assert.equal(flights[0].scheduled, '2026-11-13T14:35:00.000Z')
  assert.equal(flights[0].gate, undefined)
  assert.equal(flights[0].estimated, undefined)
})

test('rejects block pages and changed markup instead of returning a false empty board', () => {
  assert.throws(() => parseAvionioFlights('<title>Access denied</title>', now))
  assert.throws(() => parseAvionioFlights(html.replaceAll('data-ts=', 'changed='), now))
  assert.deepEqual(parseAvionioFlights(html, now + 48 * 3600000), [])
})

test('preserves cancellations, filters departed flights and deduplicates', () => {
  const cancelled = html.replaceAll('scheduled', 'cancelled').replaceAll('Scheduled', 'Cancelled')
  assert.equal(parseAvionioFlights(cancelled, now)[0].cancelled, true)
  assert.deepEqual(parseAvionioFlights(html.replaceAll('scheduled', 'departed'), now), [])
  assert.equal(parseAvionioFlights(html + html, now).length, 2)
})
