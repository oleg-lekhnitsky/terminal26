import test from 'node:test'
import assert from 'node:assert/strict'
import { purchasedFonts, createDownloadToken, verifyDownloadToken, downloadLifetime } from '../server/utils/fontDelivery.ts'
const session = { id: 'cs_test_example', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: 1500, metadata: { font_ids: 'italic' } }
test('only paid orders unlock the purchased products', () => {
  assert.deepEqual(purchasedFonts(session).map(item => item.id), ['italic'])
  assert.deepEqual(purchasedFonts({ ...session, payment_status: 'unpaid' }), [])
  assert.deepEqual(purchasedFonts({ ...session, mode: 'setup' }), [])
  assert.throws(() => purchasedFonts({ ...session, amount_total: 100 }))
  assert.throws(() => purchasedFonts({ ...session, currency: 'eur' }))
  assert.throws(() => purchasedFonts({ ...session, metadata: { font_ids: '../regular' } }))
})
test('pack and test purchase entitlements remain distinct', () => {
  assert.deepEqual(purchasedFonts({ ...session, amount_total: 4000, metadata: { font_ids: 'full-pack' } }).map(item => item.id), ['full-pack'])
  assert.deepEqual(purchasedFonts({ ...session, amount_total: 100, metadata: { font_ids: 'test-font' } }).map(item => item.id), ['test-font'])
})
test('new and historical full pack orders retain their paid price', () => {
  const order = { ...session, metadata: { font_ids: 'full-pack' } }
  assert.equal(purchasedFonts({ ...order, amount_total: 6900 })[0].price, 69)
  assert.equal(purchasedFonts({ ...order, amount_total: 4000 })[0].price, 40)
  assert.throws(() => purchasedFonts({ ...order, amount_total: 6800 }))
  assert.throws(() => purchasedFonts({ ...order, amount_total: 4000, currency: 'eur' }))
})
test('download links reject tampering, other orders, different secrets, and expiry', () => {
  const now = 1700000000000
  const token = createDownloadToken(session.id, 'test-signing-secret', now)
  assert.equal(verifyDownloadToken(token, session.id, 'test-signing-secret', now), true)
  assert.equal(verifyDownloadToken(token, 'cs_test_other', 'test-signing-secret', now), false)
  assert.equal(verifyDownloadToken(token, session.id, 'other-secret', now), false)
  assert.equal(verifyDownloadToken(`a${token}`, session.id, 'test-signing-secret', now), false)
  assert.equal(verifyDownloadToken(token, session.id, 'test-signing-secret', now + downloadLifetime * 1000), false)
})

const discountedPack = {
  ...session, status: 'complete', amount_subtotal: 6900, amount_total: 5520,
  total_details: { amount_discount: 1380, amount_tax: 0, amount_shipping: 0 },
  metadata: { font_ids: 'full-pack' },
}
test('Stripe-confirmed percentage and fixed discounts unlock the purchased fonts', () => {
  assert.equal(purchasedFonts(discountedPack)[0].price, 69)
  assert.equal(purchasedFonts({ ...discountedPack, amount_total: 5900, total_details: { amount_discount: 1000 } })[0].id, 'full-pack')
  assert.equal(purchasedFonts({ ...discountedPack, amount_total: 4000, total_details: { amount_discount: 2900 } })[0].price, 69)
  const individual = { ...session, amount_subtotal: 1500, amount_total: 1200, total_details: { amount_discount: 300 } }
  assert.equal(purchasedFonts(individual)[0].id, 'italic')
})
test('discount validation rejects mismatches, invalid amounts and wrong currency', () => {
  for (const override of [
    { amount_subtotal: 6800 }, { amount_total: 5500 }, { currency: 'eur' },
    { amount_subtotal: undefined }, { amount_total: -1 },
    { total_details: { amount_discount: -1 } }, { total_details: { amount_discount: 7000 } },
    { total_details: { amount_discount: 1380.5 } }, { total_details: { amount_discount: NaN } },
    { total_details: { amount_discount: 1380, amount_tax: 100 } },
    { total_details: { amount_discount: 1380, amount_shipping: 100 } },
  ]) assert.throws(() => purchasedFonts({ ...discountedPack, ...override }))
})
test('100% discounts unlock only completed no-payment-required sessions', () => {
  const free = { ...discountedPack, payment_status: 'no_payment_required', amount_total: 0, total_details: { amount_discount: 6900 } }
  assert.equal(purchasedFonts(free)[0].id, 'full-pack')
  assert.deepEqual(purchasedFonts({ ...free, status: 'open' }), [])
  assert.deepEqual(purchasedFonts({ ...free, status: 'expired' }), [])
  assert.deepEqual(purchasedFonts({ ...free, status: undefined }), [])
  assert.deepEqual(purchasedFonts({ ...free, payment_status: 'unpaid' }), [])
  assert.throws(() => purchasedFonts({ ...free, total_details: { amount_discount: 0 } }))
})
test('historical $40 full pack orders still validate with Stripe subtotal fields', () => {
  const old = { ...discountedPack, amount_subtotal: 4000, amount_total: 4000, total_details: { amount_discount: 0 } }
  assert.equal(purchasedFonts(old)[0].price, 40)
  assert.equal(purchasedFonts({ ...old, amount_total: 3200, total_details: { amount_discount: 800 } })[0].price, 40)
})
