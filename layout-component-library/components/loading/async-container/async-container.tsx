"use client"
import { cn } from "@/lib/utils"
import type { AsyncContainerProps } from "@/lib/loading/types"
import { Spinner } from "../spinner/spinner"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AsyncContainer<T, E = Error>({
  state,
  loading,
  error,
  empty,
  children,
  className,
}: AsyncContainerProps<T, E>) {
  // Loading state
  if (state.status === "loading") {
    return (
      <div className={cn("flex min-h-[200px] items-center justify-center", className)}>
        {loading || <Spinner size="lg" />}
      </div>
    )
  }

  // Error state
  if (state.status === "error") {
    const errorContent = error ? (
      error(state.error)
    ) : (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">
            {state.error instanceof Error ? state.error.message : "An unexpected error occurred"}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    )

    return <div className={cn("flex min-h-[200px] items-center justify-center", className)}>{errorContent}</div>
  }

  // Success state with no data (empty)
  if (state.status === "success" && !state.data) {
    return (
      <div className={cn("flex min-h-[200px] items-center justify-center", className)}>
        {empty || (
          <div className="text-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </div>
    )
  }

  // Success state with data
  if (state.status === "success") {
    return <div className={className}>{children(state.data)}</div>
  }

  // Idle state
  return null
}
