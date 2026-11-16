import test from 'node:test'
import assert from 'node:assert/strict'
import { createMetallicLetterGeometry } from '../app/utils/metallicLettersRenderer.ts'
import { fontVariants } from '../app/utils/fontVariants.ts'

test('all eight font styles produce finite, extruded lowercase ab geometry', () => {
  for (const style of fontVariants) for (const index of [0, 1]) {
    const geometry = createMetallicLetterGeometry(style.id, index)
    try {
      const positions = geometry.attributes.position.array
      assert.ok(positions.length > 0, style.id)
      assert.ok(Array.from(positions).every(Number.isFinite), style.id)
      const { min, max } = geometry.boundingBox
      assert.ok(max.x > min.x && max.y > min.y)
      assert.ok(max.z - min.z > .12, 'letters need real beveled depth')
      for (const axis of ['x', 'z']) assert.ok(Math.abs(max[axis] + min[axis]) < .00001)
    } finally { geometry.dispose() }
  }
})

test('a and b retain their shared baseline and different letter heights in every style', () => {
  for (const style of fontVariants) {
    const a = createMetallicLetterGeometry(style.id, 0)
    const b = createMetallicLetterGeometry(style.id, 1)
    try {
      assert.ok(Math.abs(a.boundingBox.min.y - b.boundingBox.min.y) < .00001, style.id)
      assert.ok(b.boundingBox.max.y > a.boundingBox.max.y, `${style.id}: b ascender must extend above a`)
    } finally { a.dispose(); b.dispose() }
  }
})

test('condensed selection uses narrower source outlines, not the regular mesh', () => {
  const regular = createMetallicLetterGeometry('regular', 0)
  const condensed = createMetallicLetterGeometry('condensed', 0)
  try {
    const width = geometry => geometry.boundingBox.max.x - geometry.boundingBox.min.x
    assert.ok(width(condensed) < width(regular) * .8)
  } finally { regular.dispose(); condensed.dispose() }
})
