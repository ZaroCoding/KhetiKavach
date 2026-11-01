/**
 * BentoGrid component
 * Asymmetric grid layout with variable-sized cells
 */

import type React from "react"
import { cn, validateUniqueSlots } from "@/lib/layouts/utils"
import { BentoSlot } from "./bento-slot"
import type { BentoGridProps } from "./types"

export function BentoGrid({ config, children, className }: BentoGridProps) {
  const slotIds = config.slots.map((slot) => slot.id)
  if (!validateUniqueSlots(slotIds)) {
    console.error("[BentoGrid] Duplicate slot IDs detected:", slotIds)
  }

  const { columns = 12, gap = 4, padding = 0, minRowHeight = 100 } = config

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridAutoRows: `minmax(${minRowHeight}px, auto)`,
    gap: `${gap * 0.25}rem`,
    padding: padding > 0 ? `${padding * 0.25}rem` : undefined,
  }

  return (
    <div
      className={cn("w-full", config.className, className)}
      style={gridStyle}
      role="region"
      aria-label={config.name || "Bento grid layout"}
    >
      {config.slots.map((slotConfig) => {
        const slotContent = children[slotConfig.id]

        if (!slotContent) {
          console.warn(`[BentoGrid] No content provided for slot: ${slotConfig.id}`)
          return null
        }

        return (
          <BentoSlot key={slotConfig.id} config={slotConfig}>
            {slotContent}
          </BentoSlot>
        )
      })}
    </div>
  )
}
