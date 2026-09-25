/*
 * Sample data for DEMO_MOCK=1 and the tests. Everything here is fictional: the outlets use the
 * reserved .example domain and the companies and city are made-up names. The responses have
 * exactly the shape of the API's (test/contract.test.ts validates them against the OpenAPI).
 */
import type { ContentsResponse, Result, SearchResponse, Usage } from 'typesearch-js';

export const SAMPLE_TEXT =
  "Contoso said on Tuesday it will open a battery recycling plant in Springfield next year, creating 400 jobs. The company, which raised $40 million in March, expects the plant to process 12,000 tonnes of batteries a year. Separately, Northwind Airlines confirmed it will cut 1,200 jobs, about 15% of its staff. And Springfield's city council approved a 4% rise in property taxes for 2027.";

/** What the sample model extracts from SAMPLE_TEXT. */
export const SAMPLE_CLAIMS = [
  {
    claim: 'Contoso will open a battery recycling plant in Springfield next year.',
    quote: 'Contoso said on Tuesday it will open a battery recycling plant in Springfield next year',
    query: 'Contoso battery recycling plant Springfield',
  },
  { claim: "Contoso's Springfield recycling plant will create 400 jobs.", quote: 'creating 400 jobs', query: 'Contoso Springfield plant jobs' },
  { claim: 'Contoso raised $40 million in March.', quote: 'which raised $40 million in March', query: 'Contoso raises $40 million' },
  {
    claim: "Contoso's Springfield plant will process 12,000 tonnes of batteries a year.",
    quote: 'expects the plant to process 12,000 tonnes of batteries a year',
    query: 'Contoso plant tonnes of batteries a year',
  },
  {
    claim: 'Northwind Airlines will cut 1,200 jobs, about 15% of its staff.',
    quote: 'Northwind Airlines confirmed it will cut 1,200 jobs, about 15% of its staff',
    query: 'Northwind Airlines job cuts',
  },
  {
    claim: "Springfield's city council approved a 4% rise in property taxes for 2027.",
    quote: "Springfield's city council approved a 4% rise in property taxes for 2027",
    query: 'Springfield council property tax 2027',
  },
];

type Article = { url: string; title: string; source: string; hours: number; snippet: string; score: number };

const PLANT_WIRE: Article = {
  url: 'https://examplewire.example/business/contoso-springfield-recycling-plant',
  title: 'Contoso picks Springfield for its first battery recycling plant',
  source: 'Example Wire',
  hours: 20,
  snippet: 'The plant is due to open next year, the company said on Tuesday.',
  score: 0.97,
};
const PLANT_POST: Article = {
  url: 'https://examplepost.example/local/springfield-lands-contoso-plant',
  title: 'Springfield lands Contoso recycling plant',
  source: 'The Example Post',
  hours: 17,
  snippet: 'City officials welcomed the investment, the largest in the area in a decade.',
  score: 0.93,
};
const FUNDING: Article = {
  url: 'https://techexample.example/startups/contoso-recycling-hiring',
  title: 'Contoso doubles its battery recycling team',
  source: 'Tech Example Daily',
  hours: 24 * 12,
  snippet: 'The startup is hiring engineers for its first plants.',
  score: 0.95,
};
const NORTHWIND: Article = {
  url: 'https://exampleherald.example/business/northwind-airlines-job-cuts',
  title: 'Northwind Airlines to cut 1,200 jobs',
  source: 'Example Herald',
  hours: 30,
  snippet: 'The airline blamed higher fuel costs and weaker demand on regional routes.',
  score: 0.96,
};
const COUNCIL: Article = {
  url: 'https://exampleherald.example/local/springfield-council-delays-tax-vote',
  title: 'Springfield council delays vote on property tax rise',
  source: 'Example Herald',
  hours: 40,
  snippet: 'The proposal will return to the council in November.',
  score: 0.91,
};

/** For each claim (by index): the articles found and the excerpt contents picks for the claim. */
const EVIDENCE: { article: Article; excerpt: string; relevance: number }[][] = [
  [
    { article: PLANT_WIRE, excerpt: 'Contoso said the Springfield plant would start operating in the second half of next year.', relevance: 0.97 },
    { article: PLANT_POST, excerpt: "The recycling plant, Contoso's first, is scheduled to open next year on the city's east side.", relevance: 0.94 },
  ],
  [
    { article: PLANT_WIRE, excerpt: 'The plant will employ 250 people when it reaches full capacity, the company said.', relevance: 0.93 },
    { article: PLANT_POST, excerpt: 'Contoso expects to hire about 250 workers for the site.', relevance: 0.9 },
  ],
  [{ article: FUNDING, excerpt: 'The $40 million round, announced in March, will pay for the first plants.', relevance: 0.96 }],
  [{ article: PLANT_WIRE, excerpt: 'Contoso did not say how much material the plant would be able to process.', relevance: 0.71 }],
  [{ article: NORTHWIND, excerpt: 'The cuts, about 15% of the workforce, will be made by March, the airline said.', relevance: 0.97 }],
  [{ article: COUNCIL, excerpt: 'Council members postponed the vote on the proposed 4% increase until November.', relevance: 0.95 }],
];

/** What the sample model answers for each claim. */
export const SAMPLE_VERDICTS = [
  { verdict: 'supported', explanation: 'Two outlets report that Contoso will open its Springfield plant next year [1][2].' },
  { verdict: 'contradicted', explanation: 'Both reports put the plant at about 250 jobs, not 400 [1][2].' },
  { verdict: 'supported', explanation: 'The $40 million round was announced in March [1].' },
  { verdict: 'unverified', explanation: 'The coverage found does not give the plant’s capacity [1].' },
  { verdict: 'supported', explanation: 'Northwind Airlines said it will cut 1,200 jobs, about 15% of its workforce [1].' },
  { verdict: 'contradicted', explanation: 'The council postponed the vote on the 4% rise until November; it has not approved it [1].' },
] as const;

const at = (now: number, hours: number) => new Date(now - hours * 3_600_000).toISOString().replace(/\.\d{3}Z$/, '.000Z');

function result(a: Article, now: number): Result & { country: string | null; language: string | null } {
  return {
    url: a.url,
    title: a.title,
    source: a.source,
    country: 'US',
    language: 'en',
    published_at: at(now, a.hours),
    section: new URL(a.url).pathname.split('/')[1] ?? null,
    snippet: a.snippet,
    score: a.score,
    headline_relevance: a.score,
    read: { probability: a.score, centrality: 3 },
    highlights: [],
    tone: null,
    answers: null,
    duplicates: [],
    date_match: null,
    referenced_date: null,
    found_in: 'index',
  };
}

export const PRICING: Usage['pricing'] = {
  currency: 'USD',
  per_1000_requests: { ultra: 1.4, fast: 1.4, normal: 2.2, deep: 5.6, similar: 2.2, similar_deep: 4.6, site_search: 2.4 },
  per_1000_pages: { contents: 0.2, contents_with_query: 0.4 },
};

export function sampleSearch(query: string, mode: SearchResponse['mode'], now = Date.now()): SearchResponse {
  const i = SAMPLE_CLAIMS.findIndex((c) => c.query === query);
  const results = i < 0 ? [] : EVIDENCE[i].map((e) => result(e.article, now));
  return {
    id: `req_sample_${i}`,
    object: 'search',
    mode,
    queries: [query],
    found: results.length > 0,
    total: results.length,
    results,
    groups: null,
    near_misses: [],
    rejected: [],
    diffusion: null,
    tone: null,
    essential: null,
    reference: null,
    temporal: null,
    site: null,
    index: { sources: 4, articles: 1200, updated_at: at(now, 0.05) },
    usage: {
      tokens: 2100,
      calls: 3,
      cost_usd: PRICING.per_1000_requests[mode] / 1000,
      headlines: 160,
      from_memory: 20,
      pages_direct: 4,
      pages_browser: 0,
      duration_ms: mode === 'deep' ? 7800 : 2900,
    },
    budget: null,
    discovery: { status: i < 0 ? 'used' : 'skipped', sites: 0, ms: 0 },
    incomplete: false,
    cached_at: null,
    warnings: [],
  };
}

export function sampleContents(urls: string[], query: string | undefined, now = Date.now()): ContentsResponse {
  const i = SAMPLE_CLAIMS.findIndex((c) => c.claim === query);
  return {
    id: 'req_sample_contents',
    object: 'contents',
    results: urls.map((url) => {
      const e = i < 0 ? undefined : EVIDENCE[i].find((x) => x.article.url === url);
      if (!e) return { url, status: 'error' as const, error: { code: 'not_found', message: 'Not in the sample.' }, title: null, description: null, published_at: null, source: null, excerpt: null, highlights: [], relevance: null };
      return {
        url,
        status: 'ok' as const,
        error: null,
        title: e.article.title,
        description: e.article.snippet,
        published_at: at(now, e.article.hours),
        source: e.article.source,
        excerpt: e.excerpt,
        highlights: [e.excerpt],
        relevance: query ? e.relevance : null,
      };
    }),
    usage: { tokens: 900, calls: 1, cost_usd: (urls.length * (query ? PRICING.per_1000_pages.contents_with_query : PRICING.per_1000_pages.contents)) / 1000, duration_ms: 1400 },
  };
}
