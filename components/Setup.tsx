import { Alert, Check } from './ui';

/* What to set before the first briefing, when something is missing. */
export function Setup({ apiKey, modelProblem }: { apiKey: boolean; modelProblem: string | null }) {
  const steps = [
    {
      done: apiKey,
      title: 'A typesearch API key',
      body: (
        <>
          Create one at{' '}
          <a className="text-accent underline-offset-2 hover:underline" href="https://app.typesearch.ai">
            app.typesearch.ai
          </a>{' '}
          (new accounts get a welcome credit) and set it as <code className="font-mono text-[12.5px]">TYPESEARCH_API_KEY</code>.
        </>
      ),
    },
    {
      done: !modelProblem,
      title: 'A model',
      body: (
        <>
          On Vercel, the AI Gateway works with no key. Elsewhere set <code className="font-mono text-[12.5px]">AI_GATEWAY_API_KEY</code>, or{' '}
          <code className="font-mono text-[12.5px]">OPENAI_API_KEY</code> / <code className="font-mono text-[12.5px]">ANTHROPIC_API_KEY</code> with a
          matching <code className="font-mono text-[12.5px]">MODEL</code>.
        </>
      ),
    },
  ];
  return (
    <div className="card mx-auto max-w-[640px] p-6 sm:p-8">
      <p className="eyebrow">Setup</p>
      <h2 className="display mt-3 text-[30px] text-ink">Two keys and you&rsquo;re done.</h2>
      <p className="mt-2 text-[14.5px] text-muted">
        Add them to <code className="font-mono text-[13px]">.env.local</code> (or the project&rsquo;s environment variables on Vercel) and restart.
      </p>
      <ol className="mt-6 grid gap-3">
        {steps.map((s) => (
          <li key={s.title} className="flex gap-3 rounded-[6px] border border-line p-4">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-good-soft text-good' : 'bg-doubt-soft text-doubt'}`}>
              {s.done ? <Check size={12} /> : <Alert size={12} />}
            </span>
            <div className="text-[14px] leading-relaxed">
              <p className="font-medium text-ink">{s.title}</p>
              <p className="mt-0.5 text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <pre className="mt-6 overflow-x-auto rounded-[6px] bg-[#0e0f11] p-4 font-mono text-[12.5px] leading-relaxed text-[#d6d8dc]">
        {`TYPESEARCH_API_KEY=ts_live_…
AI_GATEWAY_API_KEY=…            # not needed on Vercel
MODEL=openai/gpt-6-luna         # optional`}
      </pre>
      <p className="mt-4 text-[12.5px] text-faint">
        Just looking? Run it with <code className="font-mono">DEMO_MOCK=1</code> to try the interface with fictional sample data.
      </p>
    </div>
  );
}
