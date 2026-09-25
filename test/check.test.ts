import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEvidence, cleanCheck, contentsOptions, highlight, locateClaims, MAX_CLAIMS, searchOptions, topResults, verdictPrompt, WINDOWS } from '../lib/check.ts';
import { SAMPLE_CLAIMS, SAMPLE_TEXT, sampleContents, sampleSearch } from '../lib/sample.ts';
import { assertSchema } from './contract.ts';

test('claims are numbered and located in the text', () => {
  const claims = locateClaims(SAMPLE_TEXT, SAMPLE_CLAIMS);
  assert.equal(claims.length, SAMPLE_CLAIMS.length);
  assert.deepEqual(claims.map((c) => c.id), [1, 2, 3, 4, 5, 6]);
  for (const c of claims) {
    assert.notEqual(c.start, null, c.quote);
    assert.equal(SAMPLE_TEXT.slice(c.start as number, c.end as number), c.quote);
  }
});

test('a quote with different case or spacing is still found; an invented one is not', () => {
  const text = 'The council  approved the budget on Monday.';
  const [a, b] = locateClaims(text, [
    { claim: 'x', quote: 'the Council approved the budget', query: 'q' },
    { claim: 'y', quote: 'rejected the budget', query: 'q' },
  ]);
  assert.equal(text.slice(a.start as number, a.end as number), 'The council  approved the budget');
  assert.equal(b.start, null);
});

test('two claims never take the same words; at most MAX_CLAIMS; empty ones dropped', () => {
  const text = 'Prices rose. Prices rose.';
  const cs = locateClaims(text, [
    { claim: 'a', quote: 'Prices rose', query: 'q' },
    { claim: 'b', quote: 'Prices rose', query: 'q' },
  ]);
  assert.deepEqual(cs.map((c) => [c.start, c.end]), [[0, 11], [13, 24]]);
  const many = Array.from({ length: 12 }, (_, i) => ({ claim: `c${i}`, quote: 'zz', query: 'q' }));
  assert.equal(locateClaims('text', many).length, MAX_CLAIMS);
  assert.equal(locateClaims('text', [{ claim: ' ', quote: 'x', query: 'q' }]).length, 0);
});

test('highlight: the text in order, each claim once, nothing lost', () => {
  const claims = locateClaims(SAMPLE_TEXT, SAMPLE_CLAIMS);
  const parts = highlight(SAMPLE_TEXT, claims);
  assert.equal(parts.map((p) => p.text).join(''), SAMPLE_TEXT);
  assert.deepEqual(parts.filter((p) => p.claim !== null).map((p) => p.claim), [1, 2, 3, 4, 5, 6]);
});

test('the requests are valid for the API', () => {
  for (const mode of ['normal', 'deep'] as const)
    for (const w of WINDOWS) assertSchema('SearchRequest', { query: 'Contoso plant', ...searchOptions(mode, w.days) });
  const [claim] = locateClaims(SAMPLE_TEXT, SAMPLE_CLAIMS);
  assertSchema('ContentsRequest', { urls: ['https://examplewire.example/a'], ...contentsOptions(claim) });
});

test('evidence: the best articles, each with the excerpt about the claim', () => {
  const claims = locateClaims(SAMPLE_TEXT, SAMPLE_CLAIMS);
  const found = sampleSearch(claims[1].query, 'normal');
  const top = topResults(found.results);
  const ev = buildEvidence(top, sampleContents(top.map((r) => r.url), claims[1].claim));
  assert.equal(ev.length, 2);
  assert.match(ev[0].excerpt ?? '', /250 people/);
  assert.equal(ev[0].n, 1);
  assert.ok((ev[0].relevance ?? 0) > 0.5);
  const p = verdictPrompt(claims[1], ev);
  assert.match(p, /^Claim: Contoso's Springfield recycling plant will create 400 jobs\./);
  assert.match(p, /\[1\] Contoso picks Springfield/);
  assert.match(p, /Excerpt: «The plant will employ 250 people/);
});

test('without contents, the excerpt falls back to the search highlight', () => {
  const r = sampleSearch(SAMPLE_CLAIMS[0].query, 'normal').results.map((x) => ({ ...x, highlights: ['From the search.'] }));
  assert.equal(buildEvidence(r, null)[0].excerpt, 'From the search.');
});

test('a verdict must cite real evidence, or it is unverified', () => {
  const ev = buildEvidence(sampleSearch(SAMPLE_CLAIMS[0].query, 'normal').results, null);
  assert.deepEqual(cleanCheck({ verdict: 'supported', explanation: 'Both say so [1][2].' }, ev), { verdict: 'supported', explanation: 'Both say so[1][2].', citations: [1, 2] });
  assert.equal(cleanCheck({ verdict: 'supported', explanation: 'Trust me.' }, ev).verdict, 'unverified');
  assert.equal(cleanCheck({ verdict: 'contradicted', explanation: 'See [7].' }, ev).verdict, 'unverified');
  assert.equal(cleanCheck({ verdict: 'maybe', explanation: 'x [1]' }, ev).verdict, 'unverified');
  assert.deepEqual(cleanCheck({ verdict: 'unverified', explanation: 'Nothing on capacity.' }, ev).citations, []);
});
