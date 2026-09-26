import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUsdRate } from '../app/utils/exchangeRate.ts'

const fixture = { Cur_Abbreviation: 'USD', Cur_Scale: 1, Cur_OfficialRate: 3.1234, Date: '2026-09-23T00:00:00' }
test('USD rate is normalized per dollar and retains the provider date', () => {
  assert.deepEqual(normalizeUsdRate(fixture), { rate: 3.1234, date: '2026-09-23' })
  assert.equal(normalizeUsdRate({ ...fixture, Cur_Scale: 100 }).rate, 3.1234 / 100)
})
test('invalid or non-USD responses cannot be displayed as a rate', () => {
  for (const value of [null, {}, { ...fixture, Cur_Abbreviation: 'EUR' }, { ...fixture, Cur_Scale: 0 }, { ...fixture, Cur_OfficialRate: NaN }, { ...fixture, Cur_OfficialRate: -1 }]) {
    assert.throws(() => normalizeUsdRate(value))
  }
})

test('history is sorted, deduplicated, scaled and limited to the requested dates', async () => {
  const { normalizeRateHistory } = await import('../app/utils/exchangeRate.ts')
  const values = normalizeRateHistory([
    { Date: '2026-09-23T00:00:00', Cur_OfficialRate: 310 },
    { Date: '2026-09-22T00:00:00', Cur_OfficialRate: 300 },
    { Date: '2026-09-23T00:00:00', Cur_OfficialRate: 312 },
    { Date: '2026-08-01T00:00:00', Cur_OfficialRate: 200 },
    { Date: '2026-09-24T00:00:00', Cur_OfficialRate: -1 },
    { Date: 'invalid', Cur_OfficialRate: 300 }, null,
  ], 100, '2026-09-01', '2026-09-23')
  assert.deepEqual(values, [{ date: '2026-09-22', rate: 3 }, { date: '2026-09-23', rate: 3.12 }])
  assert.throws(() => normalizeRateHistory({}, 1, '2026-09-01', '2026-09-23'))
  assert.throws(() => normalizeRateHistory([], 0, '2026-09-01', '2026-09-23'))
})
