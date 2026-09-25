import { MockLanguageModelV4 } from 'ai/test';
import Typesearch from 'typesearch-js';
import { assertSchema } from './contract.ts';

type Handler = (path: string, body: any) => { status?: number; body: unknown };

/** A real SDK client whose fetch validates every request against the OpenAPI and answers with `handler`. */
export function fakeTypesearch(handler: Handler) {
  const requests: { path: string; body: any }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (url.pathname === '/v1/search') assertSchema('SearchRequest', body);
    if (url.pathname === '/v1/contents') assertSchema('ContentsRequest', body);
    requests.push({ path: url.pathname, body });
    const r = handler(url.pathname, body);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { ts: new Typesearch({ apiKey: 'ts_test_key', baseURL: 'https://api.typesearch.test', fetch, maxRetries: 0 }), requests };
}

const usage = {
  inputTokens: { total: 500, noCache: 500, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 80, text: 80, reasoning: undefined },
};

/** A model that answers each call with `answer(promptText)` (an object, sent as JSON). */
export function answeringModel(answer: (prompt: string) => unknown, cost?: string) {
  const calls: string[] = [];
  const model = new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      const text = JSON.stringify(prompt);
      calls.push(text);
      const out = answer(text);
      if (out instanceof Error) throw out;
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        ...(cost ? { providerMetadata: { gateway: { cost } } } : {}),
        warnings: [],
      };
    },
  });
  return { model, calls };
}

export function collector<T extends { type: string }>() {
  const events: T[] = [];
  return { events, send: (e: T) => void events.push(e), types: () => events.map((e) => e.type) };
}
