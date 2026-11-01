import type React from "react"
/**
 * Core types for the loading state system
 * Provides type-safe APIs for all loading patterns
 */

export type LoadingSize = "sm" | "md" | "lg" | "xl"
export type LoadingVariant = "spinner" | "dots" | "pulse" | "skeleton"

/**
 * Base loading state configuration
 */
export interface LoadingConfig {
  /** Size of the loading indicator */
  size?: LoadingSize
  /** Visual variant */
  variant?: LoadingVariant
  /** Accessible label for screen readers */
  label?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton-specific configuration
 */
export interface SkeletonConfig extends LoadingConfig {
  /** Width of skeleton (CSS value or 'full') */
  width?: string | "full"
  /** Height of skeleton (CSS value) */
  height?: string
  /** Border radius */
  rounded?: "none" | "sm" | "md" | "lg" | "full"
  /** Number of lines for text skeleton */
  lines?: number
  /** Animation style */
  animation?: "pulse" | "wave" | "none"
}

/**
 * Async state for data fetching
 */
export type AsyncState<T, E = Error> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E }

/**
 * Container state configuration
 */
export interface AsyncContainerProps<T, E = Error> {
  /** Current async state */
  state: AsyncState<T, E>
  /** Content to render when loading */
  loading?: React.ReactNode
  /** Content to render on error */
  error?: (error: E) => React.ReactNode
  /** Content to render when no data */
  empty?: React.ReactNode
  /** Content to render on success */
  children: (data: T) => React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Progressive loading configuration
 */
export interface ProgressiveLoadingConfig {
  /** Delay before showing loading state (ms) */
  delay?: number
  /** Minimum loading time to prevent flashing (ms) */
  minDuration?: number
  /** Fade-in duration (ms) */
  fadeInDuration?: number
  /** Enable optimistic UI */
  optimistic?: boolean
}
