import { Checker } from '@/components/Checker';
import { Setup } from '@/components/Setup';
import { Footer, Header } from '@/components/ui';
import { chooseModel, mockEnabled, modelProblem } from '@/lib/model';
import { loadPrices } from '@/lib/pricing';
import { SAMPLE_TEXT } from '@/lib/sample';
import { hasApiKey } from '@/lib/typesearch';

// Prices change rarely: the page is rebuilt at most once an hour.
export const revalidate = 3600;

export default async function Page() {
  const mock = mockEnabled();
  const apiKey = hasApiKey();
  const model = chooseModel();
  const problem = modelProblem(model);
  const ready = apiKey && !problem;
  const prices = ready ? await loadPrices() : null;

  return (
    <>
      <Header title="Fact check" />
      <main className="mx-auto max-w-[1180px] px-5 pt-10 sm:pt-14">
        <div className="mb-8 max-w-[900px] sm:mb-10">
          <p className="eyebrow">Open-source demo · typesearch + Vercel AI SDK</p>
          <h1 className="display mt-3 text-[40px] text-ink sm:text-[56px]">
            Check a text against <em>the latest news.</em>
          </h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-muted">
            Paste an article, a press release or an AI answer. Each claim is searched in recent coverage and marked supported, contradicted or
            unverified, with the quote that decides it.
          </p>
        </div>
        {ready ? <Checker prices={prices} model={model.id} mock={mock} sample={mock ? SAMPLE_TEXT : null} /> : <Setup apiKey={apiKey} modelProblem={problem} />}
      </main>
      <Footer mock={mock} />
    </>
  );
}
