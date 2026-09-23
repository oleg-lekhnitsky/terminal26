import test from 'node:test'
import assert from 'node:assert/strict'
import { radioStations } from '../app/utils/arabicRadio.ts'
const base = { stationuuid: 'one', name: 'Radio', countrycode: 'EG', url: 'https://radio.example/live', homepage: 'https://radio.example', lastcheckok: 1, hls: 0, codec: 'MP3', tags: 'arabic music' }
test('radio directory excludes broken, insecure, nonmusic and unsupported streams', () => {
  for (const change of [{ lastcheckok: 0 }, { url: 'http://radio.example/live' }, { tags: 'news,talk' }, { countrycode: 'US' }, { hls: 1 }, { codec: 'UNKNOWN' }, { url: 'https://radio.example/live.m3u8' }]) {
    assert.deepEqual(radioStations([{ ...base, ...change }]), [])
  }
  assert.equal(radioStations([base])[0].country, 'Egypt')
})
test('stations are deduplicated and countries interleaved', () => {
  const stations = radioStations([base, base, { ...base, stationuuid: 'two', url: 'https://radio.example/second' }, { ...base, stationuuid: 'three', url: 'https://radio.example/morocco', countrycode: 'MA' }])
  assert.deepEqual(stations.map(item => item.country), ['Egypt', 'Morocco', 'Egypt'])
})
