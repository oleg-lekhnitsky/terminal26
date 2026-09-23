import assert from 'node:assert/strict'
import test from 'node:test'
import { oneShotIndex, oneShotSystem, wrapTextLines, collageCamera, centeredTextBaseline, letterPose, textPresets, sequenceFrame, carouselPosition, isContinuousPreset, measureTextLayout, flow, fanPose, motionSystem, itemFrame, stepProgress, configureTextFont, typographySystem } from '../app/utils/textRenderer.ts'

test('tracking scales with rendered font size and preserves kerning', () => {
  const context = {}
  const appearance = { fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: -0.02 }
  configureTextFont(context, appearance, 100)
  assert.equal(context.letterSpacing, '-2px')
  assert.equal(context.fontKerning, 'normal')
  configureTextFont(context, appearance, 50)
  assert.equal(context.letterSpacing, '-1px')
  configureTextFont(context, { ...appearance, letterSpacing: -0.05 }, 100)
  assert.equal(context.letterSpacing, '-5px')
  configureTextFont(context, { ...appearance, letterSpacing: NaN }, 100)
  assert.equal(context.letterSpacing, `${typographySystem.letterSpacing * 100}px`)
})

test('fan moves each letter through an upright center and loops continuously', () => {
  const duration = 1.2
  const left = fanPose(0, 4, 5, duration)
  const right = fanPose(0, 1, 5, duration)
  assert.ok(left.x < 0 && right.x > 0)
  assert.equal(left.x, -right.x)
  assert.equal(left.y, right.y)
  assert.equal(left.rotation, -right.rotation)
  for (let index = 0; index < 5; index++) {
    const center = fanPose(index * (duration + motionSystem.hold), index, 5, duration)
    assert.ok(Math.abs(center.x) < 1e-8)
    assert.ok(Math.abs(center.y) < 1e-8)
    assert.ok(Math.abs(center.rotation) < 1e-8)
    assert.equal(center.opacity, 1)
    assert.deepEqual(fanPose(0, index, 5, duration), fanPose((duration + motionSystem.hold) * 5, index, 5, duration))
    assert.deepEqual(fanPose(10, index, 5, duration, true), fanPose(0, index, 5, duration))
  }
  // Flow reaches the spatial midpoint at 50% of the step.
  assert.equal(fanPose(duration * 0.5, 3, 5, duration).opacity, 0)
  assert.ok(Object.values(fanPose(1, 0, 1, duration)).every(Number.isFinite))
})

test('Flow matches the reference Bezier control points and clamps at both endpoints', () => {
  assert.equal(flow(-1), 0)
  assert.equal(flow(0), 0)
  assert.equal(flow(1), 1)
  assert.equal(flow(2), 1)
  // The symmetric curve crosses the midpoint; at t = 0.25, x = 0.398125 and y = 0.195625.
  assert.ok(Math.abs(flow(0.5) - 0.5) < 1e-6)
  assert.ok(Math.abs(flow(0.398125) - 0.195625) < 1e-6)
  assert.ok(Math.abs(flow(0.601875) - 0.804375) < 1e-6)
  let previous = 0
  for (let step = 0; step <= 100; step++) {
    const value = flow(step / 100)
    assert.ok(value >= previous && value <= 1)
    previous = value
  }
})

test('letter origins and word width retain kerning across adjacent pairs', () => {
  // Synthetic metrics isolate positioning from platform-specific font files.
  const widths = { A: 10, V: 10, T: 9, a: 8, AV: 18, AVA: 27, AVAT: 36, AVATa: 42 }
  const layout = measureTextLayout(['A', 'V', 'A', 'T', 'a'], text => {
    assert.ok(text in widths, `Unexpected measurement: ${text}`)
    return widths[text]
  })
  assert.deepEqual(layout.positions.map(unit => unit.x), [0, 8, 17, 27, 34])
  assert.equal(layout.width, 42)
  const last = layout.positions.at(-1)
  assert.equal(last.x + last.width, layout.width)
})

test('pair specimens are measured together and fitted to the widest pair', () => {
  const widths = { Aa: 17, Bb: 19, Ww: 27 }
  const layout = measureTextLayout(['Aa', 'Bb', 'Ww'], text => widths[text], true)
  assert.equal(layout.width, 27)
  assert.deepEqual(layout.positions.map(unit => unit.x), [0, 0, 0])
  assert.deepEqual(layout.positions.map(unit => unit.width), [17, 19, 27])
})

for (const preset of textPresets.filter(preset => !isContinuousPreset(preset.id))) {
  test(`${preset.id}: settles into legible text for short and long specimens`, () => {
    for (const count of [1, 8, 40]) {
      for (let index = 0; index < count; index++) {
        const pose = time => letterPose(time, index, preset.duration, preset.stagger, preset.id, count)
        assert.equal(pose(0).opacity, 0)
        const end = pose(preset.duration + count * preset.stagger)
        for (const field of ['x', 'y', 'rotation']) assert.ok(Math.abs(end[field]) < 1e-10, field)
        assert.equal(end.scale, 1)
        assert.equal(end.opacity, 1)
        for (let time = 0; time < 6; time += 0.05) {
          const current = pose(time)
          assert.ok(Object.values(current).every(Number.isFinite))
          assert.ok(current.opacity >= 0 && current.opacity <= 1)
        }
      }
    }
  })
}

test('typewriter eases one character at a time with Flow', () => {
  const count = 8
  const step = 0.13
  for (let active = 0; active < count; active++) {
    const time = (active + 0.5) * step
    const poses = Array.from({ length: count }, (_, index) => letterPose(time, index, 0.3, step, 'typewriter', count))
    assert.ok(Math.abs(poses[active].opacity - 0.5) < 1e-6)
    assert.ok(poses.slice(0, active).every(pose => pose.opacity === 1))
    assert.ok(poses.slice(active + 1).every(pose => pose.opacity === 0))
    assert.ok(poses.every(pose => pose.x === 0 && pose.y === 0))
  }
})

test('Drop uses Flow without bouncing and entrance opacity uses Flow', () => {
  const drop = letterPose(0.5, 0, 1, 0, 'drop', 1)
  assert.ok(Math.abs(drop.y + motionSystem.travel / 2) < 1e-6)
  let previous = -motionSystem.travel
  for (let step = 0; step <= 100; step++) {
    const pose = letterPose(step / 100, 0, 1, 0, 'drop', 1)
    assert.ok(pose.y >= previous && pose.y <= 0)
    previous = pose.y
  }
  for (const preset of ['rise', 'drop', 'poster']) {
    assert.ok(Math.abs(letterPose(0.5, 0, 1, 0, preset).opacity - 0.5) < 1e-6)
  }
})

test('entrance loops hold their final pose before fading and restarting', () => {
  const end = 2
  assert.deepEqual(sequenceFrame(end + motionSystem.hold / 2, end, true), { time: end, opacity: 1 })
  const fade = sequenceFrame(end + motionSystem.hold + motionSystem.exit / 2, end, true)
  assert.equal(fade.time, end)
  assert.ok(fade.opacity > 0 && fade.opacity < 1)
  assert.deepEqual(sequenceFrame(end + motionSystem.hold + motionSystem.exit + motionSystem.rest, end, true), { time: 0, opacity: 1 })
  assert.deepEqual(sequenceFrame(100, end, false), { time: end, opacity: 1 })
})

test('carousel loops continuously and advances every letter through the center', () => {
  for (const count of [1, 2, 6]) {
    for (let index = 0; index < count; index++) {
      assert.ok(Math.abs(carouselPosition(index * (1.1 + motionSystem.hold), index, count, 1.1)) < 1e-8)
      const first = carouselPosition(0.37, index, count, 1.1)
      const repeated = carouselPosition(0.37 + count * (1.1 + motionSystem.hold), index, count, 1.1)
      assert.ok(Math.abs(first - repeated) < 1e-8)
    }
  }
  assert.equal(carouselPosition(1, 0, 0, 1), 0)
})


test('traveling and replacing specimens share move, hold, and exit beats', () => {
  const duration = motionSystem.enter
  const holdTime = duration + motionSystem.hold / 2
  const heldItem = itemFrame(holdTime, duration)
  assert.equal(heldItem.offset, 0)
  assert.equal(heldItem.opacity, 1)
  assert.equal(stepProgress(holdTime, duration), 1)
  assert.ok(Math.abs(stepProgress(duration * 0.5, duration) - 0.5) < 1e-6)
  const exiting = itemFrame(duration + motionSystem.hold + motionSystem.exit * 0.5, duration)
  assert.ok(Math.abs(exiting.opacity - 0.5) < 1e-6)
  assert.ok(Math.abs(exiting.offset + motionSystem.travel / 2) < 1e-6)
  const cycle = duration + motionSystem.hold + motionSystem.exit + motionSystem.rest
  assert.equal(itemFrame(cycle, duration).index, 1)
  assert.equal(itemFrame(cycle, duration).opacity, 0)
})

test('Rise, Drop, and Poster share distance, easing, and opacity', () => {
  const time = motionSystem.enter * 0.5
  const poses = ['rise', 'drop', 'poster'].map(preset => letterPose(time, 0, motionSystem.enter, motionSystem.stagger, preset))
  for (const pose of poses) assert.ok(Math.abs(Math.abs(pose.y) - motionSystem.travel / 2) < 1e-6)
  assert.equal(poses[0].opacity, poses[1].opacity)
  assert.equal(poses[1].opacity, poses[2].opacity)
})


test('word and number fades follow movement throughout entrances and exits', () => {
  for (const preset of textPresets.filter(preset => ['words', 'numbers'].includes(preset.id))) {
    for (const fraction of [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]) {
      const entering = itemFrame(preset.duration * fraction, preset.duration)
      assert.ok(Math.abs(entering.opacity - flow(fraction)) < 1e-6)
      assert.ok(Math.abs(entering.offset / motionSystem.travel + entering.opacity - 1) < 1e-6)
      const exiting = itemFrame(preset.duration + motionSystem.hold + motionSystem.exit * fraction, preset.duration)
      assert.ok(Math.abs(exiting.opacity - (1 - flow(fraction))) < 1e-6)
      assert.ok(Math.abs(exiting.offset / motionSystem.travel - exiting.opacity + 1) < 1e-6)
    }
  }
})


test('visible glyph bounds center vertically regardless of font metrics', () => {
  const cap = { actualBoundingBoxAscent: 82, actualBoundingBoxDescent: -4 }
  const descender = { actualBoundingBoxAscent: 70, actualBoundingBoxDescent: 18 }
  for (const metric of [cap, descender]) {
    const baseline = centeredTextBaseline(400, [metric])
    const top = baseline - metric.actualBoundingBoxAscent
    const bottom = baseline + metric.actualBoundingBoxDescent
    assert.equal((top + bottom) / 2, 200)
  }
  const blockBaseline = centeredTextBaseline(400, [cap, descender], 95)
  assert.equal((blockBaseline - 82 + blockBaseline + 95 + 18) / 2, 200)
  assert.equal(centeredTextBaseline(400, []), 200)
})


test('collage camera explores a larger field, loops continuously, and respects reduced motion', () => {
  const duration = motionSystem.enter * 2
  const leg = duration * 4 + motionSystem.hold
  assert.deepEqual(collageCamera(0, duration), { x: 0, y: 0 })
  assert.deepEqual(collageCamera(leg * 4, duration), { x: 0, y: 0 })
  assert.deepEqual(collageCamera(leg * 2, duration), { x: 0.625, y: 0.625 })
  for (let step = 1; step <= 4; step++) {
    const before = collageCamera(leg * step - 1e-6, duration)
    const after = collageCamera(leg * step, duration)
    assert.ok(Math.abs(before.x - after.x) < 1e-6)
    assert.ok(Math.abs(before.y - after.y) < 1e-6)
  }
  for (let time = 0; time < leg * 4; time += 0.1) {
    const camera = collageCamera(time, duration)
    assert.ok(camera.x >= 0 && camera.x <= 0.625 && camera.y >= 0 && camera.y <= 0.625)
    assert.deepEqual(collageCamera(time, duration, true), { x: 0, y: 0 })
  }
})


test('paragraph wrapping preserves words and uses measured line widths', () => {
  const measure = text => text.length * 10
  assert.deepEqual(wrapTextLines('  One tiny   fix becomes three hours. ', 100, measure), ['One tiny', 'fix', 'becomes', 'three', 'hours.'])
  assert.deepEqual(wrapTextLines('unbreakable word', 30, measure), ['unbreakable', 'word'])
  assert.deepEqual(wrapTextLines('   ', 100, measure), [])
})


test('canvas font selection includes both weight and italic style', () => {
  const context = {}
  for (const [fontWeight, fontStyle, expected] of [
    [400, 'normal', 'normal 400 72px "AB Terminal", sans-serif'],
    [400, 'italic', 'italic 400 72px "AB Terminal", sans-serif'],
    [700, 'normal', 'normal 700 72px "AB Terminal", sans-serif'],
    [700, 'italic', 'italic 700 72px "AB Terminal", sans-serif'],
  ]) {
    configureTextFont(context, { fontFamily: typographySystem.fontFamily, fontWeight, fontStyle }, 72)
    assert.equal(context.font, expected)
    assert.equal(context.fontKerning, 'normal')
  }
})


test('One Shot 01 cuts equally timed slots and preserves the full alphabet cycle', () => {
  const slot = oneShotSystem.duration / oneShotSystem.slots
  for (let index = 0; index < 26; index++) {
    assert.equal(oneShotIndex(index * slot + 1e-8, 26), index)
    assert.equal(oneShotIndex((index + 1) * slot - 1e-8, 26), index)
  }
  assert.equal(oneShotIndex(4, 6), 0)
  assert.equal(oneShotIndex(4, 26), 6)
  assert.equal(oneShotIndex(26 * slot + 1e-8, 26), 0)
  assert.equal(oneShotIndex(-1, 26), 0)
  assert.equal(oneShotIndex(1, 0), 0)
})

test('Carousel 18 fans through an upright center with seamless steps and no added hold', async () => {
  const { carousel18Pose } = await import('../app/utils/textRenderer.ts')
  const duration = motionSystem.enter * 2
  const center = carousel18Pose(0, 0, 6, duration)
  assert.equal(center.rotation, 0)
  assert.equal(center.scale, 1)
  const left = carousel18Pose(0, 1, 6, duration)
  const right = carousel18Pose(0, 5, 6, duration)
  assert.equal(left.rotation, -right.rotation)
  assert.equal(left.position, -right.position)
  assert.equal(left.scale, right.scale)
  assert.equal(carousel18Pose(duration, 1, 6, duration).rotation, 0)
  const loop = carousel18Pose(duration * 6, 0, 6, duration)
  assert.ok(Math.abs(loop.position - center.position) < 1e-6)
  assert.ok(Math.abs(loop.rotation - center.rotation) < 1e-6)
  assert.ok(Math.abs(loop.scale - center.scale) < 1e-6)
  assert.ok(carousel18Pose(duration * 1.1, 1, 6, duration).position > 0)
  assert.deepEqual(carousel18Pose(50, 0, 6, duration, true), center)
})
