import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMinskFlights } from '../app/utils/minskFlights.ts'
const now = Date.parse('2026-09-23T12:00:00+03:00')
const flight = { flight_id: '1', flight: 'B2783', airport: { title: 'Istanbul ' }, plan: '2026-09-23T13:00:00+03:00', status: { id: 'empty', title: '' }, numbers_gate: ['B5'] }
test('normalizes official departures without inventing gate or status updates', () => {
  const [value] = normalizeMinskFlights([flight], now)
  assert.equal(value.destination, 'Istanbul')
  assert.equal(value.status, 'Scheduled')
  assert.equal(value.gate, 'B5')
  assert.equal(normalizeMinskFlights([{ ...flight, numbers_gate: [] }], now)[0].gate, undefined)
})
test('filters departed, old and distant flights and deduplicates', () => {
  assert.equal(normalizeMinskFlights([flight, flight, { ...flight, flight_id: '2', status: { id: 'airborne' } }, { ...flight, flight_id: '3', plan: '2026-09-22T13:00:00+03:00' }, { ...flight, flight_id: '4', plan: '2026-09-25T13:00:00+03:00' }], now).length, 1)
  assert.throws(() => normalizeMinskFlights({ error: true }, now))
})
test('preserves delays and cancellations and sorts by estimated departure', () => {
  const values = normalizeMinskFlights([{ ...flight, isDelayed: true, DelayedTo: '2026-09-23T15:00:00+03:00' }, { ...flight, flight_id: '2', isCanceled: true }], now)
  assert.equal(values[0].status, 'Cancelled')
  assert.equal(values[1].status, 'Delayed')
  assert.equal(values[1].estimated, '2026-09-23T15:00:00+03:00')
})
