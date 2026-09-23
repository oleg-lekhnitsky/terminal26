import test from 'node:test'
import assert from 'node:assert/strict'
import { createFrameGate, renderBudget } from '../app/utils/renderBudget.ts'

test('render caps remain consistent across display refresh rates', () => {
  for (const refresh of [60, 120, 144]) for (const fps of [24, 30]) {
    const gate = createFrameGate(fps)
    let count = 0
    for (let i = 0; i < refresh * 10; i++) if (gate.shouldDraw(i * 1000 / refresh)) count++
    assert.ok(Math.abs(count - fps * 10) <= 1, `${refresh}Hz / ${fps}fps produced ${count}`)
  }
})
test('resume paints immediately without catch-up bursts', () => {
  const gate = createFrameGate(30)
  assert.equal(gate.shouldDraw(0), true)
  assert.equal(gate.shouldDraw(1), false)
  gate.reset()
  assert.equal(gate.shouldDraw(2), true)
  assert.equal(gate.shouldDraw(10000), true)
  assert.equal(gate.shouldDraw(10001), false)
})
test('hidden horse readback is reduced while retaining at least two samples per glyph cell', () => {
  assert.ok(renderBudget.silhouetteSize >= 72 * 2)
  assert.ok(renderBudget.silhouetteSize ** 2 <= 600 ** 2 * .1)
})
