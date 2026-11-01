/**
 * BentoSlot component
 * Individual slot within a bento grid
 */

import type React from "react"
import { cn } from "@/lib/layouts/utils"
import type { BentoSlotProps } from "./types"

export function BentoSlot({ config, children, className }: BentoSlotProps) {
  const { span, spanMd, spanSm } = config

  const slotStyle: React.CSSProperties = {
    gridColumn: `span ${span.cols}`,
    gridRow: `span ${span.rows}`,
  }

  const responsiveClasses: string[] = ["relative", "overflow-hidden"]

  if (spanSm) {
    if (spanSm.cols === 12 || !spanSm.cols) {
      responsiveClasses.push("col-span-full sm:col-auto")
    }
  } else {
    responsiveClasses.push("col-span-full sm:col-auto")
  }

  return (
    <div
      id={config.id}
      className={cn(responsiveClasses, config.className, className)}
      style={slotStyle}
      aria-label={config.ariaLabel || config.label}
    >
      {children}
    </div>
  )
}
