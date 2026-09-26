import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveFontSymbols } from '../app/utils/fontSymbols.ts'

test('chair shortcut preserves real ampersands and adjacent shortcuts', () => {
  assert.equal(resolveFontSymbols('thechair & thechair'), '\uE005 & \uE005')
  assert.deepEqual(Array.from(resolveFontSymbols('thechairthetaxi')), ['\uE005', '\uE004'])
})

test('taxi resolves to one checkerboard glyph before animation segmentation', () => {
  assert.deepEqual(Array.from(resolveFontSymbols('thetaxithebird').toUpperCase()), ['\uE004', '\uE000'])
  assert.equal(resolveFontSymbols('Taxi thetaxi!'), 'Taxi \uE004!')
})

test('bird resolves before per-character uppercasing, preserving adjacent symbols', () => {
  assert.deepEqual(Array.from(resolveFontSymbols('thebird|').toUpperCase()), ['\uE000', '|'])
  assert.equal(resolveFontSymbols('A thebird thebird B'), 'A \uE000 \uE000 B')
  assert.equal(resolveFontSymbols('AB Terminal 123'), 'AB Terminal 123')
  assert.equal(resolveFontSymbols('THEBIRD'), 'THEBIRD')
})

test('key and bird shortcuts remain single glyphs in a mixed sequence', () => {
  assert.deepEqual(Array.from(resolveFontSymbols('thebirdthekey|').toUpperCase()), ['\uE000', '\uE001', '|'])
  assert.equal(resolveFontSymbols('thekey thekey'), '\uE001 \uE001')
  assert.equal(resolveFontSymbols('THEKEY'), 'THEKEY')
})

test('cup resolves alongside other symbols without changing the original brace', () => {
  assert.deepEqual(Array.from(resolveFontSymbols('thebirdthekeythecup}').toUpperCase()), ['\uE000', '\uE001', '\uE002', '}'])
  assert.equal(resolveFontSymbols('thecup thecup'), '\uE002 \uE002')
  assert.equal(resolveFontSymbols('THECUP'), 'THECUP')
})

test('thecoctail uses the requested spelling and preserves the original brace', () => {
  assert.deepEqual(Array.from(resolveFontSymbols('thebirdthekeythecupthecoctail{').toUpperCase()), ['\uE000', '\uE001', '\uE002', '\uE003', '{'])
  assert.equal(resolveFontSymbols('thecoctail thecoctail'), '\uE003 \uE003')
})
