/**
 * Spinner Component
 * Animated loading indicator
 */

import React from "react"
import { cn } from "@/lib/utils"
import type { LoadingConfig } from "@/lib/loading/types"
import { getLoadingSizeClasses } from "@/lib/loading/utils"

export interface SpinnerProps extends LoadingConfig {
  /** Show with backdrop overlay */
  overlay?: boolean
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = "md", label = "Loading...", overlay = false, className }, ref) => {
    const spinner = (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(
          "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
          getLoadingSizeClasses(size),
          className,
        )}
      >
        <span className="sr-only">{label}</span>
      </div>
    )

    if (overlay) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          {spinner}
        </div>
      )
    }

    return spinner
  },
)

Spinner.displayName = "Spinner"

/**
 * Dots loading indicator
 */
export function LoadingDots({ size = "md", label = "Loading...", className }: LoadingConfig) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
    xl: "h-3 w-3",
  }

  return (
    <div role="status" aria-label={label} className={cn("flex items-center gap-1", className)}>
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("animate-bounce rounded-full bg-current", dotSizes[size])}
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Pulse loading indicator
 */
export function LoadingPulse({ size = "md", label = "Loading...", className }: LoadingConfig) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("animate-pulse rounded-full bg-primary", getLoadingSizeClasses(size), className)}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}
