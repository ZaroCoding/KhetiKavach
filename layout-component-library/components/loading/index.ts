/**
 * Loading states barrel export
 * All loading components in one place
 */

// Skeleton
export { Skeleton } from "./skeleton/skeleton"
export {
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonForm,
  SkeletonStats,
  SkeletonAvatar,
} from "./skeleton/presets"
export type { SkeletonProps } from "./skeleton/skeleton"

// Spinner
export { Spinner, LoadingDots, LoadingPulse } from "./spinner/spinner"
export type { SpinnerProps } from "./spinner/spinner"

// Async Container
export { AsyncContainer } from "./async-container/async-container"
export type { AsyncContainerProps, AsyncState } from "@/lib/loading/types"

// Progressive Loader
export { ProgressiveLoader } from "./progressive/progressive-loader"
export type { ProgressiveLoaderProps } from "./progressive/progressive-loader"

// Types
export type { LoadingConfig, SkeletonConfig, ProgressiveLoadingConfig } from "@/lib/loading/types"
