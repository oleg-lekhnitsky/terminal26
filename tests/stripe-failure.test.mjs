import test from 'node:test'
import assert from 'node:assert/strict'
import { stripeFailure } from '../server/utils/stripeFailure.ts'
test('Stripe diagnostics distinguish authentication and permission errors without leaking secrets', () => {
  const diagnostic = stripeFailure({ response: { status: 401, headers: { get: () => 'req_123' } }, message: 'Invalid key sk_live_secret', options: { headers: { Authorization: 'Bearer sk_live_secret' } }, data: { error: { type: 'invalid_request_error', code: 'api_key_expired', message: 'sk_live_secret' } } })
  assert.equal(diagnostic.category, 'authentication')
  assert.equal(diagnostic.requestId, 'req_123')
  assert.equal(diagnostic.code, 'api_key_expired')
  assert.ok(!JSON.stringify(diagnostic).includes('sk_live_secret'))
  assert.equal(stripeFailure({ status: 403 }).category, 'permissions')
  assert.equal(stripeFailure({ name: 'TimeoutError' }).category, 'timeout')
})
test('unexpected diagnostic values are not copied to logs', () => {
  assert.equal(stripeFailure({ data: { error: { code: 'sk_live_secret', type: 'sk_live_secret' } } }).code, undefined)
  assert.equal(stripeFailure(null).category, 'connection_or_response')
})
