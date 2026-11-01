import type React from "react"
/**
 * Stack layout types
 * Vertical or horizontal stacking with consistent spacing
 */

import type { LayoutConfig } from "@/lib/layouts/types"

export type StackDirection = "vertical" | "horizontal"
export type StackAlign = "start" | "center" | "end" | "stretch"
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly"

export interface StackConfig extends LayoutConfig {
  /**
   * Stack direction
   */
  direction?: StackDirection

  /**
   * Alignment of items
   */
  align?: StackAlign

  /**
   * Justification of items
   */
  justify?: StackJustify

  /**
   * Whether items should wrap
   */
  wrap?: boolean

  /**
   * Whether to split items (space-between)
   */
  split?: boolean
}

export interface StackLayoutProps {
  config: StackConfig
  children: React.ReactNode
  className?: string
}
