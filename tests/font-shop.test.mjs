import test from 'node:test'
import assert from 'node:assert/strict'
import { addFontToCart, fontProducts, toggleFontSelection } from '../app/utils/fontShop.ts'

test('each font style is $15 and the full pack is $40', () => {
  assert.equal(fontProducts.length, 5)
  assert.ok(fontProducts.filter(item => item.id !== 'full-pack').every(item => item.price === 15))
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

test('test font is not offered for sale', () => {
  assert.equal(fontProducts.some(item => item.id === 'test-font'), false)
})

test('purchase selection supports multiple styles and removing the last selection', () => {
  const selected = toggleFontSelection(['regular'], 'bold')
  assert.deepEqual(selected, ['regular', 'bold'])
  assert.equal(fontProducts.filter(product => selected.includes(product.id)).reduce((total, product) => total + product.price, 0), 30)
  assert.deepEqual(toggleFontSelection(selected, 'regular'), ['bold'])
  assert.deepEqual(toggleFontSelection(['bold'], 'bold'), [])
})

test('full pack and individual purchase selections never overlap', () => {
  assert.deepEqual(toggleFontSelection(['regular', 'italic'], 'full-pack'), ['full-pack'])
  assert.deepEqual(toggleFontSelection(['full-pack'], 'bold'), ['bold'])
  assert.deepEqual(toggleFontSelection(['full-pack'], 'full-pack'), [])
})
