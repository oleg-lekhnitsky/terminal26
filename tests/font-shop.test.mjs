import test from 'node:test'
import assert from 'node:assert/strict'
import { addFontToCart, fontProducts } from '../app/utils/fontShop.ts'

test('each font style is $15 and the full pack is $40', () => {
  assert.equal(fontProducts.length, 6)
  assert.ok(fontProducts.filter(item => item.id !== 'full-pack' && item.id !== 'test-font').every(item => item.price === 15))
  assert.equal(fontProducts.find(item => item.id === 'full-pack').price, 40)
})
test('cart avoids duplicate font licenses', () => {
  assert.deepEqual(addFontToCart(['regular'], 'regular'), ['regular'])
  assert.deepEqual(addFontToCart(['regular'], 'italic'), ['regular', 'italic'])
})
test('the full pack replaces individual styles and already includes every style', () => {
  assert.deepEqual(addFontToCart(['regular', 'bold'], 'full-pack'), ['full-pack'])
  assert.deepEqual(addFontToCart(['full-pack'], 'bold-italic'), ['full-pack'])
})

test('test font costs $1 and stays separate from the full pack', () => {
  assert.equal(fontProducts.find(item => item.id === 'test-font').price, 1)
  assert.deepEqual(addFontToCart(['test-font'], 'test-font'), ['test-font'])
  assert.deepEqual(addFontToCart(['test-font', 'regular'], 'full-pack'), ['test-font', 'full-pack'])
  assert.deepEqual(addFontToCart(['full-pack'], 'test-font'), ['full-pack', 'test-font'])
})
