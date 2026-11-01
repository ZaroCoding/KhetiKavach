import type React from "react"
/**
 * Split layout types
 * Two-column layout with configurable ratios
 */

import type { LayoutConfig } from "@/lib/layouts/types"

export type SplitRatio = "50-50" | "60-40" | "40-60" | "70-30" | "30-70" | "66-33" | "33-66"
export type SplitDirection = "horizontal" | "vertical"

export interface SplitConfig extends LayoutConfig {
  /**
   * Split ratio between left/right or top/bottom
   */
  ratio?: SplitRatio

  /**
   * Split direction
   */
  direction?: SplitDirection

  /**
   * Whether split is resizable
   */
  resizable?: boolean

  /**
   * Minimum size for each panel (in pixels)
   */
  minSize?: number

  /**
   * Stack vertically on mobile
   */
  stackOnMobile?: boolean
}

export interface SplitSlots {
  left: React.ReactNode
  right: React.ReactNode
}

export interface SplitLayoutProps {
  config: SplitConfig
  children: SplitSlots
  className?: string
}
