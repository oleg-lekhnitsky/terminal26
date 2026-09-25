import test from 'node:test'
import assert from 'node:assert/strict'
import { galleryLayouts, galleryCardStyle } from '../app/utils/galleryLayout.ts'

test('each responsive arrangement includes every card exactly once', () => {
  const expected = [...galleryLayouts[1][0]].sort()
  for (const [count, columns] of Object.entries(galleryLayouts)) {
    assert.equal(columns.length, Number(count))
    assert.deepEqual(columns.flat().sort(), expected, `${count} columns must not omit or duplicate a card`)
  }
})

test('CSS placements reproduce each curated column without order collisions', () => {
  for (const [count, columns] of Object.entries(galleryLayouts)) {
    const orders = new Set()
    columns.forEach((column, index) => {
      const placed = galleryLayouts[1][0]
        .filter(id => galleryCardStyle(id)[`--column-${count}`] === index + 1)
        .sort((a, b) => galleryCardStyle(a)[`--order-${count}`] - galleryCardStyle(b)[`--order-${count}`])
      assert.deepEqual(placed, column)
      placed.forEach(id => orders.add(galleryCardStyle(id)[`--order-${count}`]))
    })
    assert.equal(orders.size, galleryLayouts[1][0].length)
  }
})
