import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runCheck } from '../lib/run.ts';
import { SAMPLE_CLAIMS, SAMPLE_TEXT, SAMPLE_VERDICTS, sampleContents, sampleSearch } from '../lib/sample.ts';
import type { CheckEvent } from '../lib/types.ts';
import { answeringModel, collector, fakeTypesearch } from './helpers.ts';

type Of<T extends CheckEvent['type']> = Extract<CheckEvent, { type: T }>;

const sampleApi = () =>
  fakeTypesearch((path, body) => ({ body: path === '/v1/search' ? sampleSearch(body.query, body.mode) : sampleContents(body.urls, body.query) }));

const sampleModel = (cost?: string) =>
  answeringModel((p) => {
    if (p.includes('You find the claims')) return { claims: SAMPLE_CLAIMS };
    const i = SAMPLE_CLAIMS.findIndex((c) => p.includes(`Claim: ${c.claim}`.replace(/"/g, '\\"')));
    return SAMPLE_VERDICTS[i];
  }, cost);

test('a check: claims, evidence and a verdict for each, the cost and the end', async () => {
  const { ts, requests } = sampleApi();
  const { model, calls } = sampleModel('0.0001');
  const c = collector<CheckEvent>();
  await runCheck({ text: SAMPLE_TEXT, mode: 'normal', days: 30 }, c.send, { ts, model, modelId: 'openai/gpt-6-luna', concurrency: 2 });

  assert.equal(c.types()[0], 'claims');
  assert.deepEqual(c.types().slice(-2), ['cost', 'done']);
  const claims = (c.events[0] as Of<'claims'>).claims;
  assert.equal(claims.length, 6);

  const verdicts = Object.fromEntries(c.events.filter((e): e is Of<'verdict'> => e.type === 'verdict').map((e) => [e.id, e.check.verdict]));
  assert.deepEqual(verdicts, { 1: 'supported', 2: 'contradicted', 3: 'supported', 4: 'unverified', 5: 'supported', 6: 'contradicted' });
  for (const e of c.events.filter((e): e is Of<'verdict'> => e.type === 'verdict')) {
    const ev = (c.events.find((x) => x.type === 'evidence' && x.id === e.id) as Of<'evidence'>).evidence;
    assert.ok(e.check.citations.every((n) => n >= 1 && n <= ev.length));
  }

  assert.equal(calls.length, 7, 'one call for the claims and one per claim');
  const searches = requests.filter((r) => r.path === '/v1/search');
  const contents = requests.filter((r) => r.path === '/v1/contents');
  assert.equal(searches.length, 6);
  assert.equal(contents.length, 6);
  assert.ok(contents.every((r) => SAMPLE_CLAIMS.some((s) => s.claim === r.body.query)), 'contents is asked about the claim itself');

  const { cost } = c.events.at(-2) as Of<'cost'>;
  assert.equal(cost.searches, 6);
  assert.equal(cost.pages, 8);
  assert.equal(cost.typesearch_usd, Math.round((6 * 0.0022 + 8 * 0.0004) * 1e6) / 1e6);
  assert.equal(cost.model_usd?.toFixed(4), '0.0007');
  assert.equal(cost.input_tokens, 7 * 500);
});

test('a claim with no coverage is unverified without asking the model', async () => {
  const { ts } = fakeTypesearch((path, body) => ({ body: path === '/v1/search' ? { ...sampleSearch('nothing', body.mode) } : sampleContents(body.urls, body.query) }));
  const { model, calls } = answeringModel((p) => (p.includes('You find the claims') ? { claims: [SAMPLE_CLAIMS[0]] } : new Error('should not be called')));
  const c = collector<CheckEvent>();
  await runCheck({ text: SAMPLE_TEXT, mode: 'normal', days: 30 }, c.send, { ts, model, modelId: 'm' });
  assert.deepEqual(c.types(), ['claims', 'evidence', 'verdict', 'cost', 'done']);
  assert.equal((c.events[2] as Of<'verdict'>).check.verdict, 'unverified');
  assert.equal(calls.length, 1);
});

test('a text without claims ends right away', async () => {
  const { ts, requests } = sampleApi();
  const { model } = answeringModel(() => ({ claims: [] }));
  const c = collector<CheckEvent>();
  await runCheck({ text: 'I think this is a lovely day, really.', mode: 'normal', days: 30 }, c.send, { ts, model, modelId: 'm' });
  assert.deepEqual(c.types(), ['claims', 'cost', 'done']);
  assert.equal(requests.length, 0);
});

test('no credit: one error per claim at most, and the rest is not attempted', async () => {
  const { ts, requests } = fakeTypesearch(() => ({
    status: 402,
    body: { type: 'about:blank', title: 'Insufficient credits', status: 402, detail: 'No credit left.', code: 'insufficient_credits', request_id: 'req_x' },
  }));
  const { model } = sampleModel();
  const c = collector<CheckEvent>();
  await runCheck({ text: SAMPLE_TEXT, mode: 'normal', days: 30 }, c.send, { ts, model, modelId: 'm', concurrency: 1 });
  const errors = c.events.filter((e): e is Of<'claim-error'> => e.type === 'claim-error');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].status, 402);
  assert.match(errors[0].hint ?? '', /credit/);
  assert.equal(requests.length, 1);
});

test('a model that fails on the claims is one clear error', async () => {
  const { ts } = sampleApi();
  const { model } = answeringModel(() => new Error('Unauthorized: invalid API key'));
  const c = collector<CheckEvent>();
  await runCheck({ text: SAMPLE_TEXT, mode: 'normal', days: 30 }, c.send, { ts, model, modelId: 'openai/gpt-6-luna' });
  assert.deepEqual(c.types(), ['error', 'cost', 'done']);
  assert.match((c.events[0] as Of<'error'>).message, /credentials/);
});
