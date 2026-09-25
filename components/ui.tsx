/* Small shared pieces: the typesearch mark, a few icons and the page frame. */

export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <rect x="2" y="3" width="16" height="3.5" rx="1.75" fill="var(--color-accent)" />
      <rect x="2" y="8.25" width="11" height="3.5" rx="1.75" fill="currentColor" />
      <rect x="2" y="13.5" width="6" height="3.5" rx="1.75" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

type IconProps = { size?: number; className?: string };
const icon = (d: React.ReactNode) =>
  function Icon({ size = 16, className = '' }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {d}
      </svg>
    );
  };

export const ArrowUpRight = icon(<path d="M7 17 17 7M7 7h10v10" />);
export const Check = icon(<path d="M20 6 9 17l-5-5" />);
export const Alert = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </>,
);
export const Sparkle = icon(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />);
export const Github = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

export function Pulse() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  );
}

export const REPO_URL = 'https://github.com/typesearch-ai/fact-check';

export function Header({ title }: { title: string }) {
  return (
    <header className="border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <a href="https://typesearch.ai" className="flex items-center gap-2 text-ink">
            <Mark />
            <span className="text-[17px] font-semibold tracking-[-0.04em]">typesearch</span>
          </a>
          <span className="h-4 w-px bg-line-strong" aria-hidden />
          <span className="whitespace-nowrap text-[14px] text-muted">{title}</span>
        </div>
        <nav className="flex items-center gap-1 text-[13px]">
          <a href="https://typesearch.ai/docs" className="hidden rounded-[4px] px-2.5 py-1.5 text-muted hover:bg-sand hover:text-ink sm:inline-flex">
            Docs
          </a>
          <a href={REPO_URL} aria-label="Source on GitHub" className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-muted hover:bg-sand hover:text-ink">
            <Github size={14} /> <span className="hidden sm:inline">Source</span>
          </a>
          <a href="https://app.typesearch.ai" className="ml-1 inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-[4px] bg-ink px-3 font-medium text-white hover:bg-[#26282e]">
            <span className="hidden sm:inline">Get an</span> API key
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ mock }: { mock: boolean }) {
  return (
    <footer className="mx-auto mt-16 flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-6 text-[12px] text-faint">
      <p>
        Open-source demo built with{' '}
        <a className="text-muted underline decoration-line-strong underline-offset-2 hover:text-ink" href="https://typesearch.ai">
          typesearch
        </a>{' '}
        and the{' '}
        <a className="text-muted underline decoration-line-strong underline-offset-2 hover:text-ink" href="https://ai-sdk.dev">
          Vercel AI SDK
        </a>
        . Verdicts are a language model&rsquo;s reading of the articles linked: check the sources.
      </p>
      {mock ? <p className="font-mono uppercase tracking-wider">Sample data · fictional outlets</p> : null}
    </footer>
  );
}
