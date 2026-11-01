import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

/**
 * Card skeleton with image and text
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton height="200px" rounded="lg" />
      <div className="space-y-2">
        <Skeleton height="24px" width="60%" />
        <Skeleton lines={2} />
      </div>
    </div>
  )
}

/**
 * List item skeleton
 */
export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Skeleton height="48px" width="48px" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton height="16px" width="40%" />
        <Skeleton height="14px" width="60%" />
      </div>
    </div>
  )
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
  columns = 4,
  className,
}: {
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height="20px" className="flex-1" />
      ))}
    </div>
  )
}

/**
 * Avatar with text skeleton
 */
export function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Skeleton height="40px" width="40px" rounded="full" />
      <div className="space-y-2">
        <Skeleton height="16px" width="120px" />
        <Skeleton height="14px" width="80px" />
      </div>
    </div>
  )
}

/**
 * Form skeleton
 */
export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height="16px" width="100px" />
          <Skeleton height="40px" rounded="md" />
        </div>
      ))}
      <Skeleton height="40px" width="120px" rounded="md" />
    </div>
  )
}

/**
 * Dashboard stats skeleton
 */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-6">
          <Skeleton height="14px" width="60%" />
          <Skeleton height="32px" width="40%" />
          <Skeleton height="12px" width="80%" />
        </div>
      ))}
    </div>
  )
}
