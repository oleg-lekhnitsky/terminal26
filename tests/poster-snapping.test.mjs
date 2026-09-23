import test from 'node:test'
import assert from 'node:assert/strict'
import { snapAxis, snapRotation } from '../app/utils/posterSnapping.ts'

test('movement snaps near the center and both edges, and releases outside the threshold', () => {
  assert.deepEqual(snapAxis(475, 100, 960, 6), { value: 480, guide: 480 })
  assert.deepEqual(snapAxis(104, 100, 960, 6), { value: 100, guide: 0 })
  assert.deepEqual(snapAxis(855, 100, 960, 6), { value: 860, guide: 960 })
  assert.deepEqual(snapAxis(470, 100, 960, 6), { value: 470, guide: null })
})
test('rotation snaps near 15-degree increments with force and bypass modifiers', () => {
  assert.equal(snapRotation(88), 90)
  assert.equal(snapRotation(-43), -45)
  assert.equal(snapRotation(359), 360)
  assert.equal(snapRotation(37), 37)
  assert.equal(snapRotation(37, true), 30)
  assert.equal(snapRotation(88, false, true), 88)
})
