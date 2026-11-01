import type React from "react"
/**
 * Cluster layout types
 * Flexbox wrapping layout for tags, chips, buttons, etc.
 */

import type { LayoutConfig, Spacing } from "@/lib/layouts/types"

export type ClusterAlign = "start" | "center" | "end"
export type ClusterJustify = "start" | "center" | "end"

export interface ClusterConfig extends LayoutConfig {
  /**
   * Vertical alignment
   */
  align?: ClusterAlign

  /**
   * Horizontal justification
   */
  justify?: ClusterJustify

  /**
   * Horizontal gap between items
   */
  gapX?: Spacing

  /**
   * Vertical gap between rows
   */
  gapY?: Spacing
}

export interface ClusterLayoutProps {
  config: ClusterConfig
  children: React.ReactNode
  className?: string
}
