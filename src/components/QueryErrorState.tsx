import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/utils-app";

/**
 * Shown when a request fails, instead of an endless skeleton. Always offers a retry.
 * Usage:  if (query.isError) return <QueryErrorState error={query.error} onRetry={() => query.refetch()} />;
 */
export function QueryErrorState({
  error,
  onRetry,
  title = "This didn’t load",
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <section role="alert" className={cn("card-elevated mx-auto max-w-2xl p-8 text-center", className)}>
      <CircleAlert className="mx-auto h-8 w-8 text-brand" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 break-words text-sm text-muted-foreground">{errorMessage(error, "Something went wrong while loading this page.")}</p>
      {onRetry && (
        <Button type="button" className="mt-5" onClick={onRetry}>
          <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" /> Try again
        </Button>
      )}
    </section>
  );
}
