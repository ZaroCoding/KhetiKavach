/**
 * StackLayout component
 * Simple vertical or horizontal stacking with spacing
 */

import { cn } from "@/lib/layouts/utils"
import type { StackLayoutProps } from "./types"

export function StackLayout({ config, children, className }: StackLayoutProps) {
  const { direction = "vertical", align = "stretch", justify = "start", wrap = false, split = false, gap = 4 } = config

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  }

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  }

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        alignClasses[align],
        split ? "justify-between" : justifyClasses[justify],
        wrap && "flex-wrap",
        config.className,
        className,
      )}
      style={{ gap: gap > 0 ? `${gap * 0.25}rem` : undefined }}
      role="region"
      aria-label={config.name || "Stack layout"}
    >
      {children}
    </div>
  )
}

export { StackLayout as Stack }
