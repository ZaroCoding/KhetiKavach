"use client"

/**
 * ProgressiveLoader Component
 * Handles progressive loading with delays and fade-ins
 */

import React from "react"
import type { ProgressiveLoadingConfig } from "@/lib/loading/types"

export interface ProgressiveLoaderProps extends ProgressiveLoadingConfig {
  /** Whether content is currently loading */
  isLoading: boolean
  /** Loading fallback */
  fallback: React.ReactNode
  /** Content to show when loaded */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function ProgressiveLoader({
  isLoading,
  fallback,
  children,
  delay = 200,
  minDuration = 500,
  fadeInDuration = 300,
  className,
}: ProgressiveLoaderProps) {
  const [showLoading, setShowLoading] = React.useState(false)
  const [showContent, setShowContent] = React.useState(!isLoading)
  const loadingStartTime = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isLoading) {
      setShowContent(false)
      // Delay showing loading state to prevent flashing
      const delayTimer = setTimeout(() => {
        setShowLoading(true)
        loadingStartTime.current = Date.now()
      }, delay)

      return () => clearTimeout(delayTimer)
    } else {
      // Ensure minimum loading duration
      if (loadingStartTime.current) {
        const elapsed = Date.now() - loadingStartTime.current
        const remaining = Math.max(0, minDuration - elapsed)

        setTimeout(() => {
          setShowLoading(false)
          setShowContent(true)
        }, remaining)
      } else {
        setShowLoading(false)
        setShowContent(true)
      }
    }
  }, [isLoading, delay, minDuration])

  return (
    <div className={className}>
      {showLoading && <div className="animate-in fade-in">{fallback}</div>}
      {showContent && (
        <div
          className="animate-in fade-in"
          style={{
            animationDuration: `${fadeInDuration}ms`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
