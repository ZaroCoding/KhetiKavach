"use client"

/**
 * Utility functions for loading states
 */

import type { LoadingSize, ProgressiveLoadingConfig } from "./types"

/**
 * Get size classes for loading indicators
 */
export function getLoadingSizeClasses(size: LoadingSize = "md"): string {
  const sizes: Record<LoadingSize, string> = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  }
  return sizes[size]
}

/**
 * Get skeleton animation classes
 */
export function getSkeletonAnimationClasses(animation: "pulse" | "wave" | "none" = "pulse"): string {
  if (animation === "none") return ""
  if (animation === "wave") return "animate-shimmer"
  return "animate-pulse"
}

/**
 * Progressive loading hook helper
 */
export function useProgressiveLoading(
  isLoading: boolean,
  config: ProgressiveLoadingConfig = {},
): {
  shouldShowLoading: boolean
  shouldShowContent: boolean
} {
  const { delay = 200, minDuration = 500 } = config
  const [shouldShowLoading, setShouldShowLoading] = React.useState(false)
  const [shouldShowContent, setShouldShowContent] = React.useState(!isLoading)
  const loadingStartTime = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isLoading) {
      // Delay showing loading state to prevent flashing
      const delayTimer = setTimeout(() => {
        setShouldShowLoading(true)
        loadingStartTime.current = Date.now()
      }, delay)

      return () => clearTimeout(delayTimer)
    } else {
      // Ensure minimum loading duration
      if (loadingStartTime.current) {
        const elapsed = Date.now() - loadingStartTime.current
        const remaining = Math.max(0, minDuration - elapsed)

        setTimeout(() => {
          setShouldShowLoading(false)
          setShouldShowContent(true)
        }, remaining)
      } else {
        setShouldShowLoading(false)
        setShouldShowContent(true)
      }
    }
  }, [isLoading, delay, minDuration])

  return { shouldShowLoading, shouldShowContent }
}

/**
 * Create optimistic update helper
 */
export function createOptimisticUpdate<T>(currentData: T, optimisticData: Partial<T>): T {
  return { ...currentData, ...optimisticData }
}

import React from "react"
