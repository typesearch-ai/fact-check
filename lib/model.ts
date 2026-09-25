import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel, ProviderMetadata } from 'ai';

/*
 * Which model extracts the claims and judges them. `MODEL` is a `provider/model` id. With OPENAI_API_KEY (for
 * `openai/…`) or ANTHROPIC_API_KEY (for `anthropic/…`) the call goes straight to that provider;
 * otherwise it goes through the Vercel AI Gateway: AI_GATEWAY_API_KEY locally, or nothing at all on
 * Vercel, where the project's OIDC token is used.
 */

export const DEFAULT_MODEL = 'openai/gpt-6-luna';

export type ModelRoute = 'gateway' | 'openai' | 'anthropic' | 'mock';

export interface ModelChoice {
  id: string;
  route: ModelRoute;
}

type Env = Record<string, string | undefined>;

export function chooseModel(env: Env = process.env): ModelChoice {
  if (mockEnabled(env)) return { id: 'mock/fact-checker', route: 'mock' };
  const id = env.MODEL?.trim() || DEFAULT_MODEL;
  if (id.startsWith('openai/') && env.OPENAI_API_KEY) return { id, route: 'openai' };
  if (id.startsWith('anthropic/') && env.ANTHROPIC_API_KEY) return { id, route: 'anthropic' };
  return { id, route: 'gateway' };
}

/** Whether a model can be called at all, and if not, what to set. */
export function modelProblem(choice: ModelChoice, env: Env = process.env): string | null {
  if (choice.route !== 'gateway') return null;
  if (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.VERCEL) return null;
  return `No model credentials. Set AI_GATEWAY_API_KEY (any model), or OPENAI_API_KEY or ANTHROPIC_API_KEY with a matching MODEL (now ${choice.id}).`;
}

export async function languageModel(choice: ModelChoice): Promise<LanguageModel> {
  const name = choice.id.slice(choice.id.indexOf('/') + 1);
  switch (choice.route) {
    case 'openai':
      return createOpenAI()(name);
    case 'anthropic':
      return createAnthropic()(name);
    case 'mock':
      return (await import('./mock.ts')).mockModel();
    default:
      // A plain id resolves through the AI SDK's default provider: the Vercel AI Gateway.
      return choice.id;
  }
}

/** The price the AI Gateway reports for a call, in USD; null elsewhere. */
export function gatewayCost(metadata: ProviderMetadata | undefined): number | null {
  const cost = Number((metadata?.gateway as { cost?: unknown } | undefined)?.cost);
  return Number.isFinite(cost) ? cost : null;
}

/** Demo data instead of the real API and model, for screenshots and trying the UI. Off on Vercel production. */
export function mockEnabled(env: Env = process.env): boolean {
  return env.DEMO_MOCK === '1' && env.VERCEL_ENV !== 'production';
}
