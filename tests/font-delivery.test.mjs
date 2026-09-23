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
test('download links reject tampering, other orders, different secrets, and expiry', () => {
  const now = 1700000000000
  const token = createDownloadToken(session.id, 'test-signing-secret', now)
  assert.equal(verifyDownloadToken(token, session.id, 'test-signing-secret', now), true)
  assert.equal(verifyDownloadToken(token, 'cs_test_other', 'test-signing-secret', now), false)
  assert.equal(verifyDownloadToken(token, session.id, 'other-secret', now), false)
  assert.equal(verifyDownloadToken(`a${token}`, session.id, 'test-signing-secret', now), false)
  assert.equal(verifyDownloadToken(token, session.id, 'test-signing-secret', now + downloadLifetime * 1000), false)
})
