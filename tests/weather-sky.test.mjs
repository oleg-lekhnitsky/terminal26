import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { weatherSky } from '../app/utils/weatherSky.ts'

const day = { code: 0, isDay: true, time: '2026-09-23T12:00', sunrise: '2026-09-23T06:00', sunset: '2026-09-23T18:00' }
test('every condition selects an existing weather image in day and night', () => {
  for (const [kind, codes] of Object.entries({ storm: [95, 96, 99], snow: [71, 73, 75, 77, 85, 86], rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], fog: [45, 48], overcast: [3] })) {
    for (const code of codes) for (const isDay of [true, false]) {
      const sky = weatherSky({ ...day, code, isDay })
      assert.equal(sky.kind, kind)
      assert.equal(sky.brightness, isDay ? 1 : .5)
      assert.ok(existsSync(new URL(`../public${sky.src}`, import.meta.url)))
    }
  }
})
test('sunrise and sunset use the city time and a bounded 45-minute window', () => {
  for (const code of [0, 1, 2]) {
    assert.equal(weatherSky({ ...day, code, time: '2026-09-23T05:30', isDay: false }).kind, 'sunrise')
    assert.equal(weatherSky({ ...day, code, time: '2026-09-23T18:30', isDay: false }).kind, 'sunset')
  }
  assert.equal(weatherSky({ ...day, time: '2026-09-23T06:46' }).kind, 'day')
  assert.equal(weatherSky({ ...day, time: '2026-09-23T19:00', isDay: false }).kind, 'night')
  assert.equal(weatherSky({ ...day, time: '2026-09-24T06:00' }).kind, 'day')
})
test('adverse weather takes precedence over sun events', () => {
  assert.equal(weatherSky({ ...day, time: day.sunrise, code: 61 }).kind, 'rain')
  assert.equal(weatherSky({ ...day, time: day.sunset, code: 3 }).kind, 'overcast')
})
test('missing sun times and unavailable weather have safe fallbacks', () => {
  assert.equal(weatherSky(undefined), undefined)
  assert.equal(weatherSky({ ...day, sunrise: undefined, sunset: undefined }).kind, 'day')
  assert.equal(weatherSky({ ...day, sunrise: 'invalid' }).kind, 'day')
})
