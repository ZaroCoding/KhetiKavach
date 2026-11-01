/**
 * Skeleton Component
 * Displays a loading placeholder that matches content shape
 */

import React from "react"
import { cn } from "@/lib/utils"
import type { SkeletonConfig } from "@/lib/loading/types"
import { getSkeletonAnimationClasses } from "@/lib/loading/utils"

export interface SkeletonProps extends SkeletonConfig {
  /** Child elements (optional, for wrapper usage) */
  children?: React.ReactNode
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width = "full", height, rounded = "md", lines, animation = "pulse", className, children, ...props }, ref) => {
    const roundedClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    }

    // Multi-line text skeleton
    if (lines && lines > 1) {
      return (
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 bg-muted",
                roundedClasses[rounded],
                getSkeletonAnimationClasses(animation),
                i === lines - 1 ? "w-4/5" : "w-full",
              )}
            />
          ))}
        </div>
      )
    }

    // Single skeleton
    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted",
          roundedClasses[rounded],
          getSkeletonAnimationClasses(animation),
          width === "full" ? "w-full" : "",
          className,
        )}
        style={{
          width: width !== "full" ? width : undefined,
          height: height,
        }}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Skeleton.displayName = "Skeleton"
