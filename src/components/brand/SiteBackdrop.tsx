/** Shared ambient backdrop: soft radial light, near-invisible grid, slow connection lines. */
export function SiteBackdrop({ lines = true }: { lines?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 ambient" />
      <div className="absolute inset-0 bg-grid" />
      {lines && (
        <svg className="absolute inset-x-0 top-0 h-[520px] w-full opacity-60" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMin slice">
          <path d="M0 120 C 300 120, 420 300, 600 300 S 900 160, 1200 200" fill="none" stroke="var(--color-brand)" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 12" className="animate-dash" />
          <path d="M0 420 C 280 400, 420 300, 600 300 S 920 440, 1200 380" fill="none" stroke="var(--color-violet)" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 12" className="animate-dash" />
        </svg>
      )}
    </div>
  );
}
