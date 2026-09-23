import test from 'node:test'
import assert from 'node:assert/strict'
import { stripeKeyProblem } from '../server/utils/stripeKey.ts'

test('rejects publishable keys without exposing their value', () => {
  const key = 'pk_live_exampleOnly'
  const problem = stripeKeyProblem(key)
  assert.match(problem, /publishable key/)
  assert.ok(!problem.includes(key))
})
test('validates server key format and tolerates surrounding whitespace', () => {
  assert.ok(stripeKeyProblem(''))
  assert.ok(stripeKeyProblem('not-a-key'))
  assert.equal(stripeKeyProblem(' sk_test_exampleOnly '), undefined)
  assert.equal(stripeKeyProblem('rk_live_exampleOnly'), undefined)
})
