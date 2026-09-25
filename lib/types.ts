import type { Result } from 'typesearch-js';

export type Verdict = 'supported' | 'contradicted' | 'unverified';
export type CheckMode = 'normal' | 'deep';

/** A checkable claim found in the text. `start`/`end` locate `quote` in it, when it was found. */
export interface Claim {
  id: number;
  claim: string;
  quote: string;
  query: string;
  start: number | null;
  end: number | null;
}

/** A numbered piece of evidence for one claim: an article and the excerpt about the claim. */
export interface Evidence {
  n: number;
  url: string;
  title: string;
  source: string | null;
  published_at: string | null;
  snippet: string | null;
  /** A short verbatim excerpt (up to 25 words) about the claim, from GET contents with `query`. */
  excerpt: string | null;
  /** Probability that the article is about the claim (contents with `query`). */
  relevance: number | null;
  score: number;
  found_in: Result['found_in'];
}

export interface Check {
  verdict: Verdict;
  /** One or two sentences with [n] markers, all pointing to real evidence. */
  explanation: string;
  citations: number[];
}

export interface CheckRequest {
  text: string;
  mode: CheckMode;
  days: number;
}

export interface Cost {
  typesearch_usd: number;
  searches: number;
  pages: number;
  model_usd: number | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

export type Problem = { source: 'typesearch' | 'model' | 'input' | 'config'; status?: number; code?: string; message: string; hint?: string };

/** What /api/check streams, one JSON object per line. */
export type CheckEvent =
  | { type: 'claims'; claims: Claim[] }
  | { type: 'evidence'; id: number; evidence: Evidence[] }
  | { type: 'verdict'; id: number; check: Check }
  | ({ type: 'claim-error'; id: number } & Problem)
  | { type: 'cost'; cost: Cost }
  | ({ type: 'error' } & Problem)
  | { type: 'done'; ms: number };
