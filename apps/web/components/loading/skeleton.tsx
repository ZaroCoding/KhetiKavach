import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface SkeletonProps extends ComponentProps<"div"> {
  /** Render this many text-like bars; the last one is shorter. */
  lines?: number;
}

/** Placeholder shaped like the content that is loading. */
export function Skeleton({ lines, className, ...props }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} role="status" aria-label="Loading" {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cn("h-4 animate-pulse rounded-md bg-muted", i === lines - 1 ? "w-4/5" : "w-full")} />
        ))}
      </div>
    );
  }
  return <div role="status" aria-label="Loading" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
