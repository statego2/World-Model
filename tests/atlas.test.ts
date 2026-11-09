import assert from 'node:assert/strict';
import test from 'node:test';
import { layerAvailability, layerStatusLabel, readAtlasQuery } from '../src/ui/atlas.ts';

test('layer availability names the World Monitor states in our own words', () => {
  assert.equal(layerAvailability(false, 3), 'unsupported');
  assert.equal(layerAvailability(true, 0), 'empty');
  assert.equal(layerAvailability(true, 12), 'ready');
  assert.equal(layerStatusLabel('ready', true), 'ενεργό');
  assert.equal(layerStatusLabel('ready', false), 'διαθέσιμο');
  assert.equal(layerStatusLabel('empty', true), 'χωρίς δεδομένα');
  assert.equal(layerStatusLabel('unsupported', false), 'χωρίς ρόλο');
});

test('the atlas query keeps layer, year and a bounded camera', () => {
  const view = readAtlasQuery('#/workspace/workspace%3Ademo/modules?layer=greece&year=2022&vx=12&vy=-4&vk=2.5');
  assert.equal(view.layer, 'greece');
  assert.equal(view.year, 2022);
  assert.deepEqual(view.camera, { x: 12, y: -4, k: 2.5 });
  const rejected = readAtlasQuery('#/modules?layer=mars&year=20&vx=9000&vk=40');
  assert.equal(rejected.layer, undefined);
  assert.equal(rejected.year, undefined);
  assert.equal(rejected.camera, undefined);
});
