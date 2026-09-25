import Typesearch, { APIConnectionError, APIError, APITimeoutError } from 'typesearch-js';
import { mockEnabled } from './model.ts';

type Env = Record<string, string | undefined>;

/** Whether the API key is there (or demo data is on). */
export function hasApiKey(env: Env = process.env): boolean {
  return mockEnabled(env) || Boolean(env.TYPESEARCH_API_KEY?.trim());
}

let client: Typesearch | null = null;

/** One client per server instance. With DEMO_MOCK=1 it answers from recorded sample data. */
export async function typesearch(): Promise<Typesearch> {
  if (client) return client;
  if (mockEnabled()) {
    const { mockFetch } = await import('./mock.ts');
    client = new Typesearch({ apiKey: 'ts_demo_sample', baseURL: 'https://api.typesearch.example', fetch: mockFetch, maxRetries: 0 });
  } else {
    client = new Typesearch({ timeout: 90_000, defaultHeaders: { 'X-Client': 'fact-check-demo' } });
  }
  return client;
}

export interface Explained {
  status?: number;
  code?: string;
  message: string;
  hint?: string;
}

/** A typesearch error, in words a person can act on. */
export function explain(e: unknown): Explained {
  if (e instanceof APIError) {
    const base = { status: e.status, code: e.code, message: e.message };
    if (e.status === 401) return { ...base, hint: 'Check TYPESEARCH_API_KEY: create a key at app.typesearch.ai.' };
    if (e.status === 402) return { ...base, hint: 'Add credit or raise the spend limit at app.typesearch.ai.' };
    if (e.status === 429) return { ...base, hint: 'Too many requests at once: wait a few seconds and try again.' };
    if (e.status === 400 && e.errors.length) {
      return { ...base, message: `${e.message} (${e.errors.map((f) => `${f.path}: ${f.message}`).join('; ')})` };
    }
    return base;
  }
  if (e instanceof APITimeoutError) return { message: 'typesearch took too long to answer.', hint: 'Try again, or use a faster mode.' };
  if (e instanceof APIConnectionError) return { message: 'Could not reach the typesearch API.', hint: 'Check the network, or TYPESEARCH_BASE_URL if you set it.' };
  return { message: e instanceof Error ? e.message : String(e) };
}
