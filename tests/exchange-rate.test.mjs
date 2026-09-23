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
