import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchUsdByn } from '../server/utils/usdByn.ts'

const rate = { Cur_ID: 431, Cur_Abbreviation: 'USD', Cur_Scale: 1, Cur_OfficialRate: 3.1, Date: '2026-10-31T00:00:00' }
test('falls back to the other official host when the API host fails', async () => {
  const calls = []
  const result = await fetchUsdByn(async url => {
    calls.push(url)
    if (url.startsWith('https://api.')) throw new Error('TLS failure')
    if (url.includes('dynamics')) return [{ Date: rate.Date, Cur_OfficialRate: 3.1 }]
    return rate
  })
  assert.equal(result.rate, 3.1)
  assert.equal(result.history.length, 1)
  assert.ok(calls[1].startsWith('https://www.nbrb.by/api/'))
})
test('history outages preserve a valid current rate', async () => {
  const result = await fetchUsdByn(async url => {
    if (url.includes('dynamics')) throw new Error('History unavailable')
    return rate
  })
  assert.deepEqual(result, { rate: 3.1, date: '2026-10-31' })
})
test('invalid responses use the next host and total outages reject', async () => {
  let count = 0
  const result = await fetchUsdByn(async () => ++count === 1 ? {} : { ...rate, Cur_ID: undefined })
  assert.equal(result.rate, 3.1)
  assert.equal(count, 2)
  await assert.rejects(fetchUsdByn(async () => { throw new Error('Unavailable') }))
})
