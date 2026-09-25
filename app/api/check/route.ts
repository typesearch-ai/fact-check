import { z } from 'zod';
import { MAX_TEXT, WINDOWS } from '@/lib/check';
import { chooseModel, languageModel, modelProblem } from '@/lib/model';
import { ndjsonResponse } from '@/lib/ndjson';
import { runCheck } from '@/lib/run';
import { hasApiKey, typesearch } from '@/lib/typesearch';
import type { CheckEvent } from '@/lib/types';

// Several searches and model calls in parallel; a deep one can take a while.
export const maxDuration = 120;

const body = z.object({
  text: z.string().trim().min(20, 'Paste a longer text.').max(MAX_TEXT, `At most ${MAX_TEXT} characters.`),
  mode: z.enum(['normal', 'deep']),
  days: z
    .number()
    .int()
    .refine((d) => WINDOWS.some((w) => w.days === d), 'Not an offered window.'),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  const choice = chooseModel();
  return ndjsonResponse<CheckEvent>(async (send, signal) => {
    if (!parsed.success) {
      send({ type: 'error', source: 'input', message: parsed.error.issues.map((i) => i.message).join(' ') });
      return;
    }
    if (!hasApiKey()) {
      send({ type: 'error', source: 'config', message: 'TYPESEARCH_API_KEY is not set.', hint: 'Create a key at app.typesearch.ai and add it to the environment.' });
      return;
    }
    const problem = modelProblem(choice);
    if (problem) {
      send({ type: 'error', source: 'config', message: problem });
      return;
    }
    await runCheck(parsed.data, send, { ts: await typesearch(), model: await languageModel(choice), modelId: choice.id, signal });
  }, request.signal);
}
