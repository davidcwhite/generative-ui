import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSaveDraft, createRun, emptyStore, mappingProblems, newDraft, parseStore, runFacts, SAMPLE_ALLOCATIONS, sampleRows, toConfig } from '../src/team-workspace/workflow-model.ts';

function readyDraft(kind = 'flash') {
  const draft = newDraft(kind);
  return { ...draft, loaded: true, confirmed: true, mapping: { ...draft.mapping, currency: 'CCY' } };
}

test('setup cannot complete before sources, currency mapping and user confirmation', () => {
  const draft = newDraft('flash');
  assert.equal(canSaveDraft(draft), false);
  draft.loaded = true;
  draft.confirmed = true;
  assert.equal(canSaveDraft(draft), false);
  draft.mapping.currency = 'CCY';
  assert.equal(canSaveDraft(draft), true);
  draft.confirmed = false;
  assert.equal(canSaveDraft(draft), false);
});

test('mapping rejects duplicate columns, incompatible types and mismatched units', () => {
  const draft = readyDraft();
  const rows = sampleRows('flash');
  assert.ok(mappingProblems({ ...draft.mapping, currency: 'Issuer' }, rows).length);
  assert.ok(mappingProblems({ ...draft.mapping, size: 'Issuer' }, rows).length);
  assert.ok(mappingProblems({ ...draft.mapping, size: 'Spread_bps', spread: 'Size_mm' }, rows).length);
  assert.ok(mappingProblems(draft.mapping, []).length);
});

test('sample calculations reconcile against the underlying inputs', () => {
  const newsletter = createRun(toConfig(readyDraft('newsletter')), 'Test week');
  assert.equal(runFacts(newsletter).total, 5000);
  assert.equal(runFacts(newsletter).count, 6);
  const flash = createRun(toConfig(readyDraft()), 'Test deal');
  assert.equal(runFacts(flash).total, SAMPLE_ALLOCATIONS.reduce((sum, row) => sum + row.millions, 0));
  assert.equal(runFacts(flash).spread, 105);
});

test('a saved run keeps its mapping and data when the workflow changes', () => {
  const config = toConfig(readyDraft());
  const run = createRun(config, 'Edition 1');
  config.name = 'Changed name';
  config.mapping.size = 'Spread_bps';
  assert.equal(run.config.name, 'Syndicate deal flash');
  assert.equal(runFacts(run).total, 750);
  run.rows[0].Size_mm = 1;
  assert.equal(sampleRows('flash')[0].Size_mm, 750);
});

test('invalid or partially corrupt browser state is recovered safely', () => {
  assert.deepEqual(parseStore('broken json'), emptyStore());
  assert.deepEqual(parseStore('{"version":2}'), emptyStore());
  const config = toConfig(readyDraft());
  const run = createRun(config, 'Edition 1');
  const parsed = parseStore(JSON.stringify({ version: 1, workflows: [config, {}], runs: [run, {}], draft: null }));
  assert.equal(parsed.workflows.length, 1);
  assert.equal(parsed.runs.length, 1);
  assert.equal(runFacts(parsed.runs[0]).total, 750);
});

test('blank edition labels and invalid pilot baselines are rejected', () => {
  assert.throws(() => createRun(toConfig(readyDraft()), ' '));
  assert.equal(canSaveDraft({ ...readyDraft(), baselineMinutes: '-10' }), false);
  assert.equal(canSaveDraft({ ...readyDraft(), baselineMinutes: 'NaN' }), false);
  assert.equal(canSaveDraft({ ...readyDraft(), baselineMinutes: '45' }), true);
});
