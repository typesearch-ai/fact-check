'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { highlight, MAX_TEXT, WINDOWS } from '@/lib/check';
import { pieces } from '@/lib/citations';
import { ago, compact, hostOf, seconds, usd } from '@/lib/format';
import { readNdjson } from '@/lib/ndjson';
import type { ClaimPrices } from '@/lib/pricing';
import type { Check, CheckEvent, CheckMode, CheckRequest, Claim, Cost, Evidence, Problem, Verdict } from '@/lib/types';
import { Alert, ArrowUpRight, Check as CheckIcon, Pulse } from './ui';

type Status = 'idle' | 'extracting' | 'checking' | 'done' | 'error';

interface Run {
  status: Status;
  request: CheckRequest | null;
  claims: Claim[];
  evidence: Record<number, Evidence[]>;
  checks: Record<number, Check>;
  failures: Record<number, Problem>;
  cost: Cost | null;
  error: Problem | null;
  ms: number | null;
}

const IDLE: Run = { status: 'idle', request: null, claims: [], evidence: {}, checks: {}, failures: {}, cost: null, error: null, ms: null };

const VERDICT: Record<Verdict, { label: string; badge: string; mark: string; dot: string }> = {
  supported: { label: 'Supported', badge: 'bg-good-soft text-good', mark: 'bg-good-soft decoration-good', dot: 'bg-good' },
  contradicted: { label: 'Contradicted', badge: 'bg-bad-soft text-bad', mark: 'bg-bad-soft decoration-bad', dot: 'bg-bad' },
  unverified: { label: 'Unverified', badge: 'bg-doubt-soft text-doubt', mark: 'bg-doubt-soft decoration-doubt', dot: 'bg-doubt' },
};

const MODES: { id: CheckMode; label: string; text: string }[] = [
  { id: 'normal', label: 'Normal', text: 'Reads the best articles for each claim.' },
  { id: 'deep', label: 'Deep', text: 'Other wordings, more articles, sites beyond the index.' },
];

export function Checker({ prices, model, mock, sample }: { prices: ClaimPrices | null; model: string; mock: boolean; sample: string | null }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<CheckMode>('normal');
  const [days, setDays] = useState<number>(30);
  const [editing, setEditing] = useState(true);
  const [run, setRun] = useState<Run>(IDLE);
  const [focus, setFocus] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = run.status === 'extracting' || run.status === 'checking';

  const start = useCallback(async (req: CheckRequest) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setFocus(null);
    setEditing(false);
    setRun({ ...IDLE, status: 'extracting', request: req });
    const update = (fn: (r: Run) => Run) => {
      if (!ac.signal.aborted) setRun(fn);
    };
    try {
      const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(`The server answered ${res.status}.`);
      await readNdjson<CheckEvent>(res.body, (e) => {
        update((r) => {
          switch (e.type) {
            case 'claims':
              return { ...r, claims: e.claims, status: e.claims.length ? 'checking' : r.status };
            case 'evidence':
              return { ...r, evidence: { ...r.evidence, [e.id]: e.evidence } };
            case 'verdict':
              return { ...r, checks: { ...r.checks, [e.id]: e.check } };
            case 'claim-error': {
              const { type: _t, id, ...problem } = e;
              return { ...r, failures: { ...r.failures, [id]: problem } };
            }
            case 'cost':
              return { ...r, cost: e.cost };
            case 'error': {
              const { type: _t, ...problem } = e;
              return { ...r, status: 'error', error: problem };
            }
            case 'done':
              return { ...r, ms: e.ms, status: r.status === 'error' ? 'error' : 'done' };
          }
        });
      });
    } catch (err) {
      if (ac.signal.aborted) return;
      update((r) => ({ ...r, status: 'error', error: { source: 'config', message: err instanceof Error ? err.message : String(err), hint: 'Check that the server is running.' } }));
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const submit = () => {
    if (!busy && text.trim().length >= 20) void start({ text: text.trim(), mode, days });
  };

  const scrollTo = (id: number) => {
    setFocus(id);
    document.getElementById(`claim-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const shownText = run.request?.text ?? text;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-start">
      {/* The text */}
      <div className="card lg:sticky lg:top-6">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="label mb-0">Text</span>
          {editing ? (
            <span className={`font-mono text-[11px] ${text.length > MAX_TEXT ? 'text-bad' : 'text-faint'}`}>
              {text.length.toLocaleString('en')} / {MAX_TEXT.toLocaleString('en')}
            </span>
          ) : (
            <button type="button" className="text-[12.5px] font-medium text-muted hover:text-ink" onClick={() => setEditing(true)} disabled={busy}>
              Edit text
            </button>
          )}
        </div>

        {editing ? (
          <form
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT}
              rows={9}
              aria-label="Text to check"
              placeholder="Paste a paragraph from a news article, a press release or an AI answer…"
              className="block min-h-[220px] w-full resize-y rounded-[4px] bg-white p-3 text-[15px] leading-[1.65] text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)] outline-none placeholder:text-faint focus:shadow-[inset_0_0_0_1px_var(--color-accent),0_0_0_3px_var(--color-accent-soft)]"
            />
            {sample ? (
              <button type="button" className="mt-2 text-[12.5px] font-medium text-accent hover:underline" onClick={() => setText(sample)}>
                Use the sample text
              </button>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="label">Search mode</legend>
                <div role="radiogroup" className="grid gap-1.5">
                  {MODES.map((m) => {
                    const on = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setMode(m.id)}
                        className={`rounded-[6px] px-3 py-2 text-left transition-shadow ${on ? 'bg-white shadow-[0_0_0_1.5px_var(--color-ink)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-line-strong)]'}`}
                      >
                        <span className="flex items-center justify-between gap-2 text-[13.5px] font-medium text-ink">
                          <span className="flex items-center gap-2">
                            {m.label}
                            {m.id === 'normal' ? <span className="rounded-[3px] bg-good-soft px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider text-good">Recommended</span> : null}
                          </span>
                          {prices ? (
                            <span className="font-mono text-[11px] font-normal text-ink-2" title="typesearch list prices, from the API: the search and up to four excerpts">
                              ≤{usd(prices[m.id])}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{m.text}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="label">Coverage from the last</legend>
                <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-[6px] bg-sand p-0.5">
                  {WINDOWS.map((w) => (
                    <button key={w.days} type="button" role="radio" aria-checked={days === w.days} onClick={() => setDays(w.days)} className="chip h-8 justify-center bg-transparent px-1">
                      {w.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] leading-snug text-faint">Prices are per claim, for typesearch. The model ({model}) is billed by its provider.</p>
              </fieldset>
            </div>

            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy || text.trim().length < 20}>
              Check the claims
            </button>
          </form>
        ) : (
          <div className="p-5">
            <p className="text-[15.5px] leading-[1.8] text-ink-2">
              {highlight(shownText, run.claims).map((part, i) => {
                if (part.claim === null) return <span key={i}>{part.text}</span>;
                const check = run.checks[part.claim];
                const style = check ? VERDICT[check.verdict].mark : 'bg-sand decoration-line-strong';
                return (
                  <mark
                    key={i}
                    onClick={() => scrollTo(part.claim as number)}
                    onMouseEnter={() => setFocus(part.claim)}
                    onMouseLeave={() => setFocus(null)}
                    className={`cursor-pointer rounded-[3px] px-0.5 text-ink underline decoration-2 underline-offset-4 transition-shadow ${style} ${focus === part.claim ? 'shadow-[0_0_0_1.5px_var(--color-ink)]' : ''}`}
                  >
                    {part.text}
                    <sup className="ml-0.5 font-mono text-[9.5px] text-muted no-underline">{part.claim}</sup>
                  </mark>
                );
              })}
            </p>
          </div>
        )}
      </div>

      {/* The claims */}
      <section aria-live="polite" className="min-w-0">
        {run.status === 'idle' ? <Legend /> : <Results run={run} focus={focus} setFocus={setFocus} />}
        {mock ? (
          <p className="mt-3 text-[11.5px] text-faint">
            <span className="mr-1.5 rounded-[3px] bg-sand px-1 py-px font-mono text-[9.5px] uppercase tracking-wider text-muted">Sample</span>
            Demo mode: fictional outlets, companies and stories, no API calls. Any text is checked as the sample text.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Legend() {
  return (
    <div className="card dots p-6 sm:p-8">
      <p className="eyebrow">How it works</p>
      <h2 className="display mt-3 text-[30px] text-ink sm:text-[34px]">
        Three answers, <em>always with the quote.</em>
      </h2>
      <ol className="mt-6 grid gap-3 text-[14px] leading-relaxed text-ink-2">
        <li className="rounded-[6px] border border-line bg-white p-4">
          <span className="font-medium text-ink">1. Claims.</span> A model finds the checkable facts in your text: who did or said what, when, how much.
        </li>
        <li className="rounded-[6px] border border-line bg-white p-4">
          <span className="font-medium text-ink">2. Evidence.</span> typesearch searches recent news for each claim and brings the short excerpt of each
          article that is about it.
        </li>
        <li className="rounded-[6px] border border-line bg-white p-4">
          <span className="font-medium text-ink">3. Verdict.</span> The model compares the claim with that evidence only:
          <span className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(VERDICT) as Verdict[]).map((v) => (
              <VerdictBadge key={v} verdict={v} />
            ))}
          </span>
          <span className="mt-2 block text-[12.5px] text-muted">No coverage is not the same as false: that is «unverified».</span>
        </li>
      </ol>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-[4px] bg-sand px-2 text-[12px] font-medium text-muted">
        <Pulse /> Checking
      </span>
    );
  }
  const v = VERDICT[verdict];
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-medium ${v.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} aria-hidden />
      {v.label}
    </span>
  );
}

function Results({ run, focus, setFocus }: { run: Run; focus: number | null; setFocus: (n: number | null) => void }) {
  const done = Object.keys(run.checks).length + Object.keys(run.failures).length;
  const count = (v: Verdict) => Object.values(run.checks).filter((c) => c.verdict === v).length;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <p className="eyebrow">
          {run.request?.mode} mode · coverage from the last {WINDOWS.find((w) => w.days === run.request?.days)?.label}
        </p>
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
          {run.status === 'extracting' ? (
            <span className="flex items-center gap-2">
              <Pulse /> Finding the claims…
            </span>
          ) : run.claims.length ? (
            <>
              {(Object.keys(VERDICT) as Verdict[]).map((v) => (
                <span key={v} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${VERDICT[v].dot}`} aria-hidden />
                  <strong className="font-semibold text-ink">{count(v)}</strong> {VERDICT[v].label.toLowerCase()}
                </span>
              ))}
              {run.status === 'checking' ? (
                <span className="flex items-center gap-2 text-faint">
                  <Pulse /> {done} of {run.claims.length} checked
                </span>
              ) : run.ms !== null ? (
                <span className="text-faint">
                  <CheckIcon size={12} className="mr-1 inline text-good" />
                  {run.claims.length} claims in {seconds(run.ms)}
                </span>
              ) : null}
            </>
          ) : run.status === 'done' ? (
            <span>No checkable claims in this text: facts about events, numbers, dates or statements.</span>
          ) : null}
        </div>
      </div>

      {run.status === 'extracting' ? (
        <div className="grid gap-3 p-5 sm:p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-[88px] rounded-[6px]" />
          ))}
        </div>
      ) : null}

      <ol className="divide-y divide-line">
        {run.claims.map((c) => (
          <ClaimItem
            key={c.id}
            claim={c}
            evidence={run.evidence[c.id]}
            check={run.checks[c.id]}
            failure={run.failures[c.id]}
            focused={focus === c.id}
            onFocus={() => setFocus(c.id)}
            onBlur={() => setFocus(null)}
          />
        ))}
      </ol>

      {run.error ? <ErrorBox problem={run.error} /> : null}
      {run.cost && run.status === 'done' ? <CostBar cost={run.cost} /> : null}
    </div>
  );
}

function ClaimItem({
  claim,
  evidence,
  check,
  failure,
  focused,
  onFocus,
  onBlur,
}: {
  claim: Claim;
  evidence: Evidence[] | undefined;
  check: Check | undefined;
  failure: Problem | undefined;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const cited = new Set(check?.citations ?? []);
  return (
    <li id={`claim-${claim.id}`} onMouseEnter={onFocus} onMouseLeave={onBlur} className={`animate-rise scroll-mt-6 px-5 py-5 transition-colors sm:px-6 ${focused ? 'bg-canvas' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        {failure ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-[4px] bg-sand px-2 text-[12px] font-medium text-muted">Not checked</span>
        ) : (
          <VerdictBadge verdict={check?.verdict ?? null} />
        )}
        <span className="font-mono text-[11px] text-faint">Claim {claim.id}</span>
      </div>
      <p className="display mt-3 text-[20px] leading-[1.3] text-ink">{claim.claim}</p>

      {check ? (
        <p className="mt-2 text-[14px] leading-[1.65] text-ink-2">
          {pieces(check.explanation, evidence?.length ?? 0).map((p, j) =>
            p.type === 'text' ? (
              <span key={j}>{p.text}</span>
            ) : (
              <span key={j} className="whitespace-nowrap">
                {p.word}
                {p.cites.map((n) => {
                  const e = evidence?.[n - 1];
                  if (!e) return null;
                  return (
                    <a
                      key={n}
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="cite"
                      data-active={active === n}
                      title={`${e.source ?? hostOf(e.url)}: ${e.title}`}
                      onMouseEnter={() => setActive(n)}
                      onMouseLeave={() => setActive(null)}
                    >
                      {n}
                    </a>
                  );
                })}
              </span>
            ),
          )}
        </p>
      ) : null}

      {failure ? (
        <p className="mt-2 flex gap-2 text-[13px] text-bad">
          <Alert size={15} className="mt-0.5 shrink-0" />
          <span>
            {failure.message} {failure.hint ? <span className="text-ink-2">{failure.hint}</span> : null}
          </span>
        </p>
      ) : null}

      {evidence === undefined && !failure ? (
        <div className="mt-3 grid gap-2">
          <div className="shimmer h-3 w-4/5 rounded-[3px]" />
          <div className="shimmer h-3 w-3/5 rounded-[3px]" />
        </div>
      ) : null}

      {evidence?.length ? (
        <ul className="mt-3 grid gap-1.5">
          {evidence.map((e) => (
            <li key={e.n}>
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={() => setActive(e.n)}
                onMouseLeave={() => setActive(null)}
                className={`flex gap-3 rounded-[6px] border px-3 py-2.5 transition-colors ${
                  active === e.n ? 'border-accent-line bg-accent-soft' : cited.has(e.n) ? 'border-line bg-white hover:border-line-strong' : 'border-line bg-canvas hover:border-line-strong'
                }`}
              >
                <span className="cite mt-0.5 shrink-0" data-active={active === e.n}>
                  {e.n}
                </span>
                <span className="min-w-0">
                  {e.excerpt ? (
                    <span className="block font-serif text-[15.5px] italic leading-snug text-ink">&ldquo;{e.excerpt}&rdquo;</span>
                  ) : (
                    <span className="block text-[13.5px] leading-snug text-ink">{e.title}</span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-faint">
                    <span className="text-muted">{e.source ?? hostOf(e.url)}</span>
                    <span>{ago(e.published_at)}</span>
                    {e.excerpt ? <span className="line-clamp-1 max-w-[260px]">{e.title}</span> : null}
                    {e.found_in !== 'index' ? <span>found beyond the index</span> : null}
                    <ArrowUpRight size={11} />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CostBar({ cost }: { cost: Cost }) {
  const total = cost.typesearch_usd + (cost.model_usd ?? 0);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-3 sm:px-6">
      <span className="text-[12.5px] text-muted">
        This check cost <strong className="font-semibold text-ink">{cost.model_usd === null ? `${usd(cost.typesearch_usd)} + model` : usd(total)}</strong>
      </span>
      <span className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <span className="rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-accent-deep">
          typesearch {usd(cost.typesearch_usd)} · {cost.searches} searches, {cost.pages} excerpts
        </span>
        <span className="rounded-[4px] bg-sand px-1.5 py-0.5 text-ink-2">
          {cost.model} {cost.model_usd === null ? '' : `${usd(cost.model_usd)} · `}
          {compact(cost.input_tokens + cost.output_tokens)} tokens
        </span>
      </span>
    </div>
  );
}

function ErrorBox({ problem }: { problem: Problem }) {
  const where = { typesearch: 'typesearch', model: 'The model', input: 'The text', config: 'Setup' }[problem.source];
  return (
    <div className="m-5 flex gap-3 rounded-[6px] border border-[#f3c9c4] bg-bad-soft px-4 py-3 sm:m-6">
      <Alert size={18} className="mt-0.5 shrink-0 text-bad" />
      <div className="min-w-0 text-[13.5px] leading-relaxed">
        <p className="font-medium text-ink">
          {where}: {problem.message}
        </p>
        {problem.hint ? <p className="mt-0.5 text-ink-2">{problem.hint}</p> : null}
        {problem.code ? (
          <p className="mt-1 font-mono text-[11px] text-muted">
            {problem.status ? `${problem.status} · ` : ''}
            {problem.code}
          </p>
        ) : null}
      </div>
    </div>
  );
}
