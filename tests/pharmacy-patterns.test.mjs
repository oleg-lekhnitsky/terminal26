import test from 'node:test'
import assert from 'node:assert/strict'
import { pharmacyFrame, pharmacyProgram, pharmacyProgramCount } from '../app/utils/pharmacyPatterns.ts'

const raster = label => {
  const width = label.length * 6
  const pixels = new Uint8ClampedArray(width * 7 * 4).fill(255)
  return { width, height: 7, pixels }
}

test('all programs use only the two scrolling labels and keep LEDs inside the cross', () => {
  const labels = new Set()
  let time = 0
  for (let index = 0; index < pharmacyProgramCount; index++) {
    const patternSeconds = 2 * (index % 4 + 1)
    for (const offset of [patternSeconds / 2, patternSeconds + 1]) {
      const frame = pharmacyFrame(time + offset, .5, label => {
        labels.add(label)
        return raster(label)
      })
      assert.equal(frame.length, 45 * 45)
      frame.forEach((value, pixel) => {
        assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
        if (Math.abs(pixel % 45 - 22) > 7 && Math.abs(Math.floor(pixel / 45) - 22) > 7) assert.equal(value, 0)
      })
    }
    time += patternSeconds + 2
  }
  assert.deepEqual([...labels].sort(), ['24H', 'PHARMACY'])
})

test('typography shots scroll through the matrix instead of holding a glyph', () => {
  assert.equal(pharmacyProgram(2.5).typeCut, true)
  const first = pharmacyFrame(2.5, .5, raster)
  const second = pharmacyFrame(3, .5, raster)
  assert.ok(first.some(value => value > 0))
  assert.notDeepEqual(first, second)
})
