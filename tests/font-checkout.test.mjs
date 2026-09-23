import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutProducts, checkoutParameters } from '../server/utils/fontCheckout.ts'

test('rejects empty, unknown, and client-priced products', () => {
  for (const input of [undefined, [], ['unknown'], [{ id: 'bold', price: 1 }], Array(7).fill('bold')]) {
    assert.throws(() => checkoutProducts(input))
  }
})
test('checkout charges server prices and deduplicates styles', () => {
  const params = checkoutParameters(['bold', 'bold', 'italic'], 'https://example.com')
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '1500')
  assert.equal(params.get('line_items[1][price_data][unit_amount]'), '1500')
  assert.equal(params.get('line_items[2][quantity]'), null)
  assert.equal(params.get('success_url'), 'https://example.com/checkout?session_id={CHECKOUT_SESSION_ID}')
})
test('full pack replaces individual checkout items', () => {
  const params = checkoutParameters(['bold', 'full-pack', 'italic'], 'https://example.com')
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '4000')
  assert.equal(params.get('line_items[1][quantity]'), null)
  assert.equal(params.get('metadata[font_ids]'), 'full-pack')
})

test('test font checkout uses exactly 100 USD cents', () => {
  const params = checkoutParameters(['test-font'], 'https://example.com')
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '100')
  assert.equal(params.get('line_items[0][price_data][currency]'), 'usd')
  assert.equal(params.get('metadata[font_ids]'), 'test-font')
})
