/*
 * DEMO_MOCK=1: the typesearch API and the model answer with the fictional sample data in
 * lib/sample.ts, with realistic delays. For screenshots, trying the UI and tests; no key, no cost.
 */
import type { LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { PRICING, SAMPLE_CLAIMS, SAMPLE_VERDICTS, sampleContents, sampleSearch } from './sample.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': 'req_sample' } });

const wait = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

/** Some claims take longer than others, as in real life. */
const jitter = (s: string) => 400 + ([...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) * 250;

export const mockFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const signal = init?.signal;
  if (url.pathname === '/v1/usage') {
    return json({
      object: 'usage',
      key: { id: 'key_sample', name: 'Sample key' },
      limits: { tokens_per_day: 2_000_000, requests_per_minute: 600, requests_per_second: 10 },
      today: { requests: 0, tokens: 0, cost_usd: 0, remaining_tokens: 2_000_000 },
      last_30_days: { requests: 0, tokens: 0, cost_usd: 0 },
      credit: null,
      pricing: PRICING,
    });
  }
  const body = JSON.parse(String(init?.body ?? '{}'));
  if (url.pathname === '/v1/search') {
    await wait(900 + jitter(body.query), signal);
    return json(sampleSearch(body.query, body.mode ?? 'normal'));
  }
  if (url.pathname === '/v1/contents') {
    await wait(700, signal);
    return json(sampleContents(body.urls, body.query));
  }
  return json({ type: 'about:blank', title: 'Not found', status: 404, detail: 'Not in the sample API.', code: 'not_found', request_id: 'req_sample' }, 404);
};

const usage = {
  inputTokens: { total: 620, noCache: 620, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 90, text: 90, reasoning: undefined },
};

/** Extracts SAMPLE_CLAIMS from any text, and gives each sample claim its sample verdict. */
export function mockModel(): LanguageModel {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'fact-checker',
    doGenerate: async ({ prompt }) => {
      const text = JSON.stringify(prompt);
      let output: unknown;
      if (text.includes('You find the claims')) {
        await wait(1200);
        output = { claims: SAMPLE_CLAIMS };
      } else {
        const i = SAMPLE_CLAIMS.findIndex((c) => text.includes(JSON.stringify(`Claim: ${c.claim}`).slice(1, -1)));
        await wait(600 + (i >= 0 ? i * 150 : 0));
        output = i >= 0 ? SAMPLE_VERDICTS[i] : { verdict: 'unverified', explanation: 'Not in the sample.' };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        providerMetadata: { gateway: { cost: '0.000062' } },
        warnings: [],
      };
    },
  });
}
