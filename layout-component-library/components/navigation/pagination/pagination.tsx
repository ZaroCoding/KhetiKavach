/**
 * Pagination component
 * Page navigation with numbered buttons
 */

"use client"

import { cn } from "@/lib/layouts/utils"
import { getPaginationRange } from "@/lib/navigation/utils"
import type { PaginationConfig } from "@/lib/navigation/types"

export interface PaginationProps {
  config: PaginationConfig
  className?: string
}

export function Pagination({ config, className }: PaginationProps) {
  const {
    currentPage,
    totalPages,
    siblingCount = 1,
    showFirstLast = true,
    showPrevNext = true,
    variant = "default",
    onPageChange,
  } = config

  const pages = getPaginationRange(currentPage, totalPages, siblingCount)

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  const buttonClasses = {
    default: "h-9 min-w-9 rounded-md hover:bg-accent",
    simple: "h-9 px-4 rounded-md hover:bg-accent",
    compact: "h-8 min-w-8 text-sm rounded hover:bg-accent",
  }

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            buttonClasses[variant],
            !canGoPrev && "pointer-events-none opacity-50",
          )}
          aria-label="First page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showPrevNext && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            buttonClasses[variant],
            !canGoPrev && "pointer-events-none opacity-50",
          )}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="inline-flex h-9 min-w-9 items-center justify-center">
              ...
            </span>
          )
        }

        const isActive = page === currentPage

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "inline-flex items-center justify-center transition-colors",
              buttonClasses[variant],
              isActive && "bg-primary text-primary-foreground font-medium hover:bg-primary",
            )}
            aria-label={`Page ${page}`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </button>
        )
      })}

      {showPrevNext && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            buttonClasses[variant],
            !canGoNext && "pointer-events-none opacity-50",
          )}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            buttonClasses[variant],
            !canGoNext && "pointer-events-none opacity-50",
          )}
          aria-label="Last page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </nav>
  )
}
