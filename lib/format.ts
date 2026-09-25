/** US dollars for tiny amounts: $0.0014, $0.021, $1.40. */
export function usd(amount: number): string {
  if (amount === 0) return '$0';
  const digits = amount >= 1 ? 2 : amount >= 0.1 ? 3 : amount >= 0.01 ? 4 : 5;
  const s = amount.toFixed(digits);
  // Keep at least two decimals, drop the rest of the trailing zeros: $0.00140 → $0.0014.
  const [int, dec = ''] = s.split('.');
  const trimmed = dec.replace(/0+$/, '').padEnd(2, '0');
  return `$${int}.${trimmed}`;
}

/** «12 min ago», «3 h ago», «2 d ago»; «just now» under a minute. */
export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return 'undated';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(s)) return 'undated';
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** 1.3 s, 850 ms. */
export function seconds(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
