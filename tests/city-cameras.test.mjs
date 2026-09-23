import test from 'node:test'
import assert from 'node:assert/strict'
import { selectCityCameras } from '../app/utils/cityCameras.ts'

test('camera catalog selects active public images and prioritizes central views', () => {
  const camera = (id, overrides = {}) => ({ camera_id: id, location_name: ` Street ${id} `, camera_status: 'TURNED_ON', screenshot_address: `https://cctv.austinmobility.io/image/${id}.jpg`, ...overrides })
  const result = selectCityCameras([
    camera('1'), camera('51'), camera('51'), camera('52', { camera_status: 'TURNED_OFF' }),
    camera('3', { screenshot_address: 'https://other.example/image/3.jpg' }),
    camera('4', { screenshot_address: 'http://cctv.austinmobility.io/image/4.jpg' }),
    camera('5', { screenshot_address: 'invalid' }), {},
  ])
  assert.deepEqual(result.map(item => item.id), ['51', '1'])
  assert.equal(result[0].name, 'Street 51')
  assert.equal(selectCityCameras(Array.from({ length: 30 }, (_, i) => camera(String(i)))).length, 12)
})
