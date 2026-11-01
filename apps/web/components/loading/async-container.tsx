"use client";

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/loading/skeleton";
import { Button } from "@/components/ui/button";
import type { AsyncState } from "@/lib/async";
import { cn } from "@/lib/utils";

interface AsyncContainerProps<T> {
  state: AsyncState<T>;
  /** Shown while loading. Defaults to three text skeleton bars. */
  loading?: ReactNode;
  /** Shown when the data is present but has nothing to show. */
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  /** When given, the error state offers a Retry button. */
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  className?: string;
}

/** Loading, error and empty states in one place. The error text is the API's real message. */
export function AsyncContainer<T>({ state, loading, empty, isEmpty, onRetry, children, className }: AsyncContainerProps<T>) {
  if (state.status === "idle") return null;
  if (state.status === "loading") return <div className={className}>{loading ?? <Skeleton lines={3} />}</div>;
  if (state.status === "error") {
    return (
      <div className={cn("flex items-start gap-2 rounded-md border border-risk-high/30 bg-red-50 p-3 text-sm", className)} role="alert">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-risk-high" />
        <div className="space-y-2">
          <p className="text-risk-high">{state.message}</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }
  if (isEmpty?.(state.data)) return <div className={className}>{empty ?? <p className="text-sm text-muted-foreground">Nothing to show.</p>}</div>;
  return <div className={className}>{children(state.data)}</div>;
}
