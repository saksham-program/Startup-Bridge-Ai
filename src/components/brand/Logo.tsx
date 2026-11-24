import { cn } from "@/lib/utils";

/**
 * StartupBridge AI brand icon (two overlapping red/orange spheres). Served from /public so it works
 * on any host. The icon is a dark glass tile, so the same image is used for light and dark themes;
 * the rounded clip and the theme-switch "breathe" animation (.logo-mark in styles.css) are CSS-only.
 */
export function LogoMark({ className }: { className?: string | undefined }) {
  return (
    <span className={cn("logo-mark relative block aspect-square h-8 w-8 shrink-0 overflow-hidden rounded-[28%] shadow-[0_0_14px_-4px_rgba(255,70,40,0.55)] sm:h-9 sm:w-9", className)}>
      <img
        src="/brand/startupbridge-icon-192.webp"
        srcSet="/brand/startupbridge-icon-192.webp 1x, /brand/startupbridge-icon-384.webp 2x"
        alt=""
        aria-hidden="true"
        width={192}
        height={192}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function Logo({ className, markClassName, compact }: { className?: string; markClassName?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {!compact && (
        <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
          StartupBridge <span className="text-brand">AI</span>
        </span>
      )}
    </span>
  );
}
