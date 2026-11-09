import { readFile } from 'node:fs/promises';
import { validateWorkspace } from '../src/core/validate.mjs';
const target = process.argv[2] ?? new URL('../data/fixtures/workspace.demo.json', import.meta.url);
const workspace = JSON.parse(await readFile(target, 'utf8'));
const errors = validateWorkspace(workspace);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Valid ${workspace.dataMode} workspace: ${workspace.entities.length} entities, ${workspace.relationships.length} relationships, ${workspace.facts.length} facts.`);
  console.log('Fixture validated. Imports and query execution remain planned.');
}
