import { generateText, Output, type LanguageModel } from 'ai';
import type Typesearch from 'typesearch-js';
import type { ContentsResponse } from 'typesearch-js';
import {
  buildEvidence,
  claimsInstructions,
  claimsSchema,
  cleanCheck,
  contentsOptions,
  locateClaims,
  NO_EVIDENCE,
  searchOptions,
  topResults,
  verdictInstructions,
  verdictPrompt,
  verdictSchema,
} from './check.ts';
import { gatewayCost } from './model.ts';
import { explain } from './typesearch.ts';
import type { CheckEvent, CheckRequest, Claim, Cost } from './types.ts';

export interface RunDeps {
  ts: Pick<Typesearch, 'search' | 'contents'>;
  model: LanguageModel;
  modelId: string;
  signal?: AbortSignal;
  /** Claims checked at the same time. */
  concurrency?: number;
  now?: Date;
}

/**
 * One check: the model finds the claims, typesearch finds recent coverage of each one and the
 * excerpt about it, and the model judges each claim against that evidence only. Every step is an
 * event; errors too.
 */
export async function runCheck(req: CheckRequest, send: (e: CheckEvent) => void, deps: RunDeps): Promise<void> {
  const started = Date.now();
  const today = (deps.now ?? new Date()).toISOString().slice(0, 10);
  const cost: Cost = { typesearch_usd: 0, searches: 0, pages: 0, model_usd: null, model: deps.modelId, input_tokens: 0, output_tokens: 0 };
  let unpriced = false;
  const addModel = (usage: { inputTokens?: number; outputTokens?: number }, price: number | null) => {
    cost.input_tokens += usage.inputTokens ?? 0;
    cost.output_tokens += usage.outputTokens ?? 0;
    if (price === null) unpriced = true;
    else cost.model_usd = (cost.model_usd ?? 0) + price;
  };
  const finish = () => {
    if (unpriced) cost.model_usd = null;
    cost.typesearch_usd = Math.round(cost.typesearch_usd * 1e6) / 1e6;
    send({ type: 'cost', cost });
    send({ type: 'done', ms: Date.now() - started });
  };

  // 1. The claims.
  let claims: Claim[];
  try {
    const r = await generateText({
      model: deps.model,
      instructions: claimsInstructions(today),
      prompt: req.text,
      output: Output.object({ schema: claimsSchema }),
      reasoning: 'low',
      maxRetries: 1,
      abortSignal: deps.signal,
      timeout: { totalMs: 60_000 },
    });
    addModel(r.totalUsage, sumGateway(r.steps));
    claims = locateClaims(req.text, r.output.claims);
  } catch (e) {
    if (deps.signal?.aborted) return;
    send({ type: 'error', source: 'model', ...modelMessage(e, deps.modelId) });
    finish();
    return;
  }
  send({ type: 'claims', claims });
  if (claims.length === 0) {
    finish();
    return;
  }

  // 2 and 3. Evidence and verdict for each claim, a few at a time.
  let fatal = false;
  const checkOne = async (claim: Claim) => {
    if (fatal || deps.signal?.aborted) return;
    let evidence;
    try {
      const found = await deps.ts.search(claim.query, searchOptions(req.mode, req.days), { signal: deps.signal });
      cost.searches += 1;
      cost.typesearch_usd += found.usage.cost_usd ?? 0;
      const top = topResults(found.results);
      let contents: ContentsResponse | null = null;
      if (top.length) {
        contents = await deps.ts.contents(
          top.map((r) => r.url),
          contentsOptions(claim),
          { signal: deps.signal },
        );
        cost.pages += top.length;
        cost.typesearch_usd += contents.usage.cost_usd ?? 0;
      }
      evidence = buildEvidence(top, contents);
    } catch (e) {
      if (deps.signal?.aborted) return;
      const problem = explain(e);
      send({ type: 'claim-error', id: claim.id, source: 'typesearch', ...problem });
      // No key, no credit: the other claims would fail the same way.
      if (problem.status === 401 || problem.status === 402) fatal = true;
      return;
    }
    send({ type: 'evidence', id: claim.id, evidence });
    if (evidence.length === 0) {
      send({ type: 'verdict', id: claim.id, check: NO_EVIDENCE });
      return;
    }
    try {
      const r = await generateText({
        model: deps.model,
        instructions: verdictInstructions(today),
        prompt: verdictPrompt(claim, evidence),
        output: Output.object({ schema: verdictSchema }),
        reasoning: 'low',
        maxRetries: 1,
        abortSignal: deps.signal,
        timeout: { totalMs: 60_000 },
      });
      addModel(r.totalUsage, sumGateway(r.steps));
      send({ type: 'verdict', id: claim.id, check: cleanCheck(r.output, evidence) });
    } catch (e) {
      if (deps.signal?.aborted) return;
      send({ type: 'claim-error', id: claim.id, source: 'model', ...modelMessage(e, deps.modelId) });
    }
  };

  await pool(claims, deps.concurrency ?? 4, checkOne);
  if (deps.signal?.aborted) return;
  finish();
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

function sumGateway(steps: { providerMetadata?: Parameters<typeof gatewayCost>[0] }[]): number | null {
  const prices = steps.map((s) => gatewayCost(s.providerMetadata));
  return prices.some((p) => p === null) ? null : prices.reduce<number>((a, p) => a + (p ?? 0), 0);
}

function modelMessage(e: unknown, modelId: string): { message: string; hint?: string } {
  const message = e instanceof Error ? e.message : String(e);
  if (/api key|unauthori[sz]ed|authentication|oidc/i.test(message)) {
    return { message: `The model (${modelId}) rejected the credentials.`, hint: 'Check AI_GATEWAY_API_KEY, or OPENAI_API_KEY / ANTHROPIC_API_KEY.' };
  }
  if (/not found|does not exist|unknown model/i.test(message)) {
    return { message: `Model ${modelId} is not available.`, hint: 'Set MODEL to a provider/model id your account can use.' };
  }
  return { message: `The model failed: ${message}` };
}
