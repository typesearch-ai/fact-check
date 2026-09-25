import assert from 'node:assert/strict';
import { test } from 'node:test';
import { perClaim } from '../lib/pricing.ts';
import { PRICING, SAMPLE_CLAIMS, sampleContents, sampleSearch } from '../lib/sample.ts';
import { assertSchema, openapi } from './contract.ts';

test('the sample data has exactly the shape of the API responses', () => {
  for (const c of SAMPLE_CLAIMS) {
    const found = sampleSearch(c.query, 'normal');
    assertSchema('SearchResponse', found);
    assertSchema('ContentsResponse', sampleContents(found.results.map((r) => r.url), c.claim));
  }
  assertSchema('SearchResponse', sampleSearch('nothing', 'deep'));
  assertSchema('ContentsResponse', sampleContents(['https://examplewire.example/unknown'], 'x'));
});

test('the sample prices are the API list prices (x-pricing in the OpenAPI)', () => {
  assert.deepEqual(PRICING, openapi['x-pricing']);
});

test('per claim: one search of the mode and up to four excerpts with query', () => {
  const p = perClaim(PRICING);
  assert.equal(p.normal.toFixed(4), ((PRICING.per_1000_requests.normal + 4 * PRICING.per_1000_pages.contents_with_query) / 1000).toFixed(4));
  assert.ok(p.deep > p.normal);
});

test('sample outlets are fictional: only .example domains', () => {
  const urls = SAMPLE_CLAIMS.flatMap((c) => sampleSearch(c.query, 'normal').results.map((r) => r.url));
  assert.ok(urls.length > 0 && urls.every((u) => new URL(u).hostname.endsWith('.example')));
});
