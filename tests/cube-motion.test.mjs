import assert from 'node:assert/strict'
import test from 'node:test'
import { alphabetPair, cubeHiddenFaces, cubePose } from '../app/utils/cubeMotion.ts'
import { motionSystem } from '../app/utils/textRenderer.ts'

test('cube turns use Flow and pause on the shared hold beat', () => {
  const move = motionSystem.enter * 2
  const cycle = move + motionSystem.hold
  assert.deepEqual(cubePose(0), { x: 0, y: 0, z: 0 })
  assert.ok(Math.abs(cubePose(move * 0.5).y + 135) < 1e-4)
  assert.deepEqual(cubePose(move), cubePose(move + motionSystem.hold / 2))
  for (let step = 1; step <= 8; step++) {
    const held = cubePose((step - 1) * cycle + move + motionSystem.hold / 2)
    assert.equal(Math.abs(held.x % 90), 0)
    assert.equal(Math.abs(held.y % 90), 0)
    assert.equal(held.z, 0)
    const middle = cubePose((step - 1) * cycle + move / 2)
    assert.ok(Math.abs(middle.z) > 10)
    // Every transition combines pitch and yaw, instead of a single-axis turn.
    const start = cubePose((step - 1) * cycle)
    assert.ok(Math.abs(Math.max(Math.abs(held.x - start.x), Math.abs(held.y - start.y)) - 270) < 1e-4)
    assert.ok(Math.abs(middle.x - start.x) > 10)
    assert.ok(Math.abs(middle.y - start.y) > 10)
    const before = cubePose(step * cycle - 1e-6)
    const after = cubePose(step * cycle)
    assert.ok(Math.abs(before.x - after.x) < 1e-4)
    assert.ok(Math.abs(before.y - after.y) < 1e-4)
    assert.ok(Math.abs(before.z - after.z) < 1e-4)
  }
})

test('only fully back-facing cube faces are eligible for new letters', () => {
  assert.deepEqual(cubeHiddenFaces(0, 0), [false, false, true, false, false, false])
  assert.deepEqual(cubeHiddenFaces(0, 180), [true, false, false, false, false, false])
  assert.deepEqual(cubeHiddenFaces(0, 90), [false, true, false, false, false, false])
  assert.deepEqual(cubeHiddenFaces(90, 0), [false, false, false, false, true, false])
  const hiddenOnce = new Set()
  const shownOnce = new Set()
  for (let time = 0; time < 8 * (motionSystem.enter * 2 + motionSystem.hold); time += 0.02) {
    const { x, y } = cubePose(time)
    cubeHiddenFaces(x, y).forEach((hidden, index) => (hidden ? hiddenOnce : shownOnce).add(index))
  }
  assert.equal(hiddenOnce.size, 6)
  assert.equal(shownOnce.size, 6)
})

test('letter pairs cycle through the alphabet', () => {
  assert.equal(alphabetPair(0), 'Aa')
  assert.equal(alphabetPair(25), 'Zz')
  assert.equal(alphabetPair(26), 'Aa')
})

test('all six faces settle with their lettering upright', () => {
  const normals = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, -1, 0], [0, 1, 0]]
  const ups = [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1]]
  const seen = new Set()
  const cycle = motionSystem.enter * 2 + motionSystem.hold
  for (let step = 0; step < 24; step++) {
    const pose = cubePose(step * cycle + motionSystem.enter * 2 + motionSystem.hold / 2)
    const x = pose.x * Math.PI / 180
    const y = pose.y * Math.PI / 180
    const transform = ([nx, ny, nz]) => [
      nx * Math.cos(y) + nz * Math.sin(y),
      ny * Math.cos(x) - (-nx * Math.sin(y) + nz * Math.cos(y)) * Math.sin(x),
      ny * Math.sin(x) + (-nx * Math.sin(y) + nz * Math.cos(y)) * Math.cos(x),
    ]
    normals.forEach((normal, index) => {
      if (transform(normal)[2] < 0.999) return
      seen.add(index)
      const up = transform(ups[index])
      assert.ok(Math.abs(up[0]) < 1e-8)
      assert.ok(Math.abs(up[1] + 1) < 1e-8)
      assert.ok(Math.abs(up[2]) < 1e-8)
    })
  }
  assert.equal(seen.size, 6)
})
