import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTS: { v: ThemePref; label: string; icon: typeof Sun }[] = [
  { v: "light", label: "Light", icon: Sun },
  { v: "dark", label: "Dark", icon: Moon },
  { v: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ showLabels, className }: { showLabels?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex items-center gap-0.5 rounded-lg border bg-surface-2 p-0.5", className)}>
      {OPTS.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={theme === o.v}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            theme === o.v && "bg-card text-foreground shadow-card",
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
          {showLabels && o.label}
        </button>
      ))}
    </div>
  );
}
