import test from 'node:test'
import assert from 'node:assert/strict'
import { hasPosterContent } from '../app/utils/posterContent.ts'

test('blank backgrounds, empty text, whitespace and invisible characters cannot publish', () => {
  for (const value of [null, {}, { photo: false, texts: [] }, { texts: ['', ' \n\t', '\u200B\uFEFF'] }, { photo: 'true', texts: [123] }]) {
    assert.equal(hasPosterContent(value), false)
  }
})
test('a captured photo or any nonempty text element can publish', () => {
  assert.equal(hasPosterContent({ photo: true, texts: [] }), true)
  assert.equal(hasPosterContent({ photo: false, texts: ['', 'Hello'] }), true)
  assert.equal(hasPosterContent({ texts: ['مرحبا'] }), true)
})
