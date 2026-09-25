import type { Pricing } from 'typesearch-js';
import { MAX_EVIDENCE } from './check.ts';
import type { CheckMode } from './types.ts';
import { typesearch } from './typesearch.ts';

/*
 * What checking one claim costs at most, from the API's own price list (GET /v1/usage): one search
 * in the chosen mode plus the excerpts of up to MAX_EVIDENCE pages with `query`. Prices are never
 * written in this code.
 */
export type ClaimPrices = Record<CheckMode, number>;

export function perClaim(pricing: Pricing): ClaimPrices {
  const pages = (MAX_EVIDENCE * pricing.per_1000_pages.contents_with_query) / 1000;
  return {
    normal: pricing.per_1000_requests.normal / 1000 + pages,
    deep: pricing.per_1000_requests.deep / 1000 + pages,
  };
}

export async function loadPrices(): Promise<ClaimPrices | null> {
  try {
    const usage = await (await typesearch()).usage({ timeout: 8000, maxRetries: 1 });
    return perClaim(usage.pricing);
  } catch {
    return null;
  }
}
