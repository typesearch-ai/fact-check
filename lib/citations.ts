/*
 * Citations are written by the model as [n] (or [n, m]) after each sentence, where n is the number
 * of a source it was given. These helpers split a text into plain parts and citations, and drop
 * any number that is not a real source: a citation that points nowhere is never shown.
 */

export type Segment = { type: 'text'; text: string } | { type: 'cite'; n: number };

const MARKER = /\s*\[(\d{1,3}(?:\s*[,;]\s*\d{1,3})*)\]/g;

/** Splits a text into text and citation segments, keeping only citations to sources 1…max. */
export function segments(text: string, max: number): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    for (const part of m[1].split(/[,;]/)) {
      const n = Number(part.trim());
      if (Number.isInteger(n) && n >= 1 && n <= max) out.push({ type: 'cite', n });
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return merge(out);
}

/**
 * For display: the punctuation that follows a group of citations goes before it, as in print
 * («…nine minutes.¹ The first…», not «…nine minutes ¹. The first…»).
 */
export function punctuateFirst(xs: Segment[]): Segment[] {
  const out: Segment[] = xs.map((s) => ({ ...s }));
  for (let i = 0; i < out.length; i++) {
    if (out[i].type !== 'cite' || out[i - 1]?.type === 'cite') continue;
    let j = i;
    while (out[j]?.type === 'cite') j++;
    const next = out[j];
    const before = out[i - 1];
    if (next?.type !== 'text' || before?.type !== 'text') continue;
    const m = next.text.match(/^[.,;:!?]+/);
    if (!m) continue;
    before.text = before.text.replace(/\s+$/, '') + m[0];
    next.text = next.text.slice(m[0].length);
  }
  return out.filter((s) => s.type === 'cite' || s.text !== '');
}

export type Piece = { type: 'text'; text: string } | { type: 'cited'; word: string; cites: number[] };

/**
 * For display: punctuation first, and each group of citations glued to the word before it, so a
 * line never starts with a citation.
 */
export function pieces(text: string, max: number): Piece[] {
  const xs = punctuateFirst(segments(text, max));
  const out: Piece[] = [];
  for (let i = 0; i < xs.length; i++) {
    const s = xs[i];
    if (s.type === 'text') {
      out.push({ type: 'text', text: s.text });
      continue;
    }
    const cites: number[] = [];
    while (xs[i]?.type === 'cite') cites.push((xs[i++] as { n: number }).n);
    i--;
    const prev = out.at(-1);
    let word = '';
    if (prev?.type === 'text') {
      const m = prev.text.match(/(\S+)$/);
      if (m) {
        word = m[1];
        prev.text = prev.text.slice(0, -word.length);
      }
    }
    out.push({ type: 'cited', word, cites });
  }
  return out.filter((p) => p.type === 'cited' || p.text !== '');
}

/** The distinct valid source numbers cited in a text, in order of first appearance. */
export function cited(text: string, max: number): number[] {
  const seen = new Set<number>();
  for (const s of segments(text, max)) if (s.type === 'cite') seen.add(s.n);
  return [...seen];
}

/** Removes every marker, valid or not: the plain text. */
export function stripCitations(text: string): string {
  return text.replace(MARKER, '').replace(/\s+([.,;:!?])/g, '$1').trim();
}

/** Rewrites a text keeping only valid markers, normalised as [n][m]. */
export function normalizeCitations(text: string, max: number): string {
  return segments(text, max)
    .map((s) => (s.type === 'text' ? s.text : `[${s.n}]`))
    .join('')
    .trim();
}

function merge(xs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of xs) {
    const prev = out.at(-1);
    if (s.type === 'text' && prev?.type === 'text') prev.text += s.text;
    else if (s.type === 'cite' && prev?.type === 'cite' && prev.n === s.n) continue;
    else out.push({ ...s });
  }
  return out;
}
