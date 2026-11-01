import type React from "react"
/**
 * Breadcrumbs component
 * Path navigation with separators
 */

import Link from "next/link"
import { cn } from "@/lib/layouts/utils"
import type { BreadcrumbItem } from "@/lib/navigation/types"

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export function Breadcrumbs({ items, separator, className }: BreadcrumbsProps) {
  const defaultSeparator = (
    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}

              {!isLast && <span aria-hidden="true">{separator || defaultSeparator}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
