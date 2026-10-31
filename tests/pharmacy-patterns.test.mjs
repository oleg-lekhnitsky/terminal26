import test from 'node:test'
import assert from 'node:assert/strict'
import { pharmacyFrame, pharmacyProgram, pharmacyProgramCount } from '../app/utils/pharmacyPatterns.ts'

test('all geometric programs illuminate LEDs only inside the cross', () => {
  let time = 0
  for (let index = 0; index < pharmacyProgramCount; index++) {
    const seconds = 2 * (index % 4 + 1)
    assert.equal(pharmacyProgram(time).index, index)
    for (const offset of [.25, seconds / 2, seconds - .25]) {
      const frame = pharmacyFrame(time + offset)
      assert.equal(frame.length, 45 * 45)
      assert.ok(frame.some(value => value > 0), `Program ${index} must illuminate the cross`)
      frame.forEach((value, pixel) => {
        assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
        if (Math.abs(pixel % 45 - 22) > 7 && Math.abs(Math.floor(pixel / 45) - 22) > 7) assert.equal(value, 0)
      })
    }
    time += seconds
  }
  assert.equal(pharmacyProgram(time).index, 0)
})

test('programs transition directly into the next animation', () => {
  assert.equal(pharmacyProgram(1.99).index, 0)
  assert.equal(pharmacyProgram(2).index, 1)
  assert.notDeepEqual(pharmacyFrame(2.5), pharmacyFrame(3))
})
