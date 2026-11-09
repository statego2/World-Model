import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMeasure } from '../src/ui/format.ts';

test('large dollar amounts use Greek compact units', () => {
  assert.equal(formatMeasure(4_201_021_706_476.62, 'USD'), '4,2 τρισ. $');
  assert.equal(formatMeasure(4_160_000_000, 'USD'), '4,2 δισ. $');
  assert.equal(formatMeasure(217_990_189_600.69, 'USD'), '218,0 δισ. $');
  assert.equal(formatMeasure(8094.9, 'million EUR'), '8,1 δισ. €');
  assert.equal(formatMeasure(120, 'MW'), '120 MW');
});
