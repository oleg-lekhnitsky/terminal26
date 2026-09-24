import assert from 'node:assert/strict'
import test from 'node:test'
import { posterLinePose, motionSystem, textPresets } from '../app/utils/textRenderer.ts'

test('poster lines reveal in order with opacity and movement synchronized', () => {
  const { duration, stagger } = textPresets.find(preset => preset.id === 'poster')
  const pose = (time, line) => posterLinePose(time, line, duration, stagger, 3)
  assert.ok(stagger > 0)
  for (let line = 0; line < 3; line++) {
    const start = line * stagger
    assert.equal(pose(start, line).opacity, 0)
    assert.ok(pose(start + 0.16, line).opacity > 0)
    const halfway = pose(start + duration / 2, line)
    assert.ok(Math.abs(halfway.opacity - 0.5) < 1e-6)
    assert.ok(Math.abs(halfway.y / motionSystem.travel + halfway.opacity - 1) < 1e-6)
    assert.equal(pose(start + duration + 0.001, line).opacity, 1)
    assert.equal(pose(start + duration + 0.001, line).y, 0)
  }
  const exitStart = duration + 2 * stagger + motionSystem.hold
  for (let line = 0; line < 3; line++) {
    assert.equal(pose(exitStart, line).opacity, 1)
    assert.equal(pose(exitStart + line * stagger + motionSystem.exit + 0.001, line).opacity, 0)
  }
  assert.ok(pose(exitStart + stagger / 2, 0).opacity < pose(exitStart + stagger / 2, 1).opacity)
})
