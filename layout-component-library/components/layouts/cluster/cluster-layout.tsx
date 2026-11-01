/**
 * ClusterLayout component
 * Wrapping flexbox layout for groups of small items
 */

import { cn } from "@/lib/layouts/utils"
import type { ClusterLayoutProps } from "./types"

export function ClusterLayout({ config, children, className }: ClusterLayoutProps) {
  const { align = "start", justify = "start", gapX = 2, gapY = 2 } = config

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  }

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  }

  return (
    <div
      className={cn("flex flex-wrap", alignClasses[align], justifyClasses[justify], config.className, className)}
      style={{
        columnGap: `${gapX * 0.25}rem`,
        rowGap: `${gapY * 0.25}rem`,
      }}
      role="region"
      aria-label={config.name || "Cluster layout"}
    >
      {children}
    </div>
  )
}
