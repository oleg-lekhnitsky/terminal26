import test from 'node:test'
import assert from 'node:assert/strict'
import { touchPair, pinchTransform } from '../app/utils/posterTouch.ts'
test('two-finger resize follows the midpoint and scales proportionally', () => {
  const start = touchPair({ x: 0, y: 0 }, { x: 100, y: 0 })
  const next = touchPair({ x: 0, y: 30 }, { x: 200, y: 30 })
  assert.deepEqual(pinchTransform(start, next, { x: 50, y: 0 }), { ratio: 2, angle: 0, x: 100, y: 30 })
})
test('two-finger rotation pivots around the fingers, including offset text centers', () => {
  const start = touchPair({ x: -50, y: 0 }, { x: 50, y: 0 })
  const next = touchPair({ x: 0, y: -50 }, { x: 0, y: 50 })
  const result = pinchTransform(start, next, { x: 20, y: 0 })
  assert.equal(result.angle, 90)
  assert.ok(Math.abs(result.x) < 1e-10)
  assert.equal(result.y, 20)
})
