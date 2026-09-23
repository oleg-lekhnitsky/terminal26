import test from 'node:test'
import assert from 'node:assert/strict'
import { validPosterId, validatePosterPng, posterByteLimit } from '../server/utils/posterValidation.ts'

test('poster routes only accept generated identifiers, never paths', () => {
  assert.equal(validPosterId('8234500000000-12345678-abcd-4abc-8abc-123456789abc'), true)
  for (const id of ['../secrets', 'regular.zip', 'a/b', undefined, '12345678-abcd-4abc-8abc-123456789abc']) assert.equal(validPosterId(id), false)
})
test('poster uploads reject other formats, wrong dimensions, and oversized bodies', () => {
  assert.throws(() => validatePosterPng(Buffer.from('<svg></svg>')))
  assert.throws(() => validatePosterPng(Buffer.alloc(posterByteLimit + 1)))
  const header = Buffer.alloc(45)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header)
  header.write('IHDR', 12)
  header.writeUInt32BE(1920, 16)
  header.writeUInt32BE(1200, 20)
  header.write('IEND', header.length - 8)
  assert.throws(() => validatePosterPng(header))
})
