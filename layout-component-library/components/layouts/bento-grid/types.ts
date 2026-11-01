/**
 * Bento Grid layout types
 */

import type React from "react"
import type { LayoutConfig, ResponsiveSlotConfig } from "@/lib/layouts/types"

/**
 * Grid cell span configuration
 */
export interface GridSpan {
  /**
   * Number of columns to span (1-12)
   */
  cols: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

  /**
   * Number of rows to span (1-6)
   */
  rows: 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Bento grid slot configuration
 */
export interface BentoSlotConfig extends ResponsiveSlotConfig {
  /**
   * Grid span for desktop
   */
  span: GridSpan

  /**
   * Grid span for tablet (defaults to full width)
   */
  spanMd?: Partial<GridSpan>

  /**
   * Grid span for mobile (defaults to full width)
   */
  spanSm?: Partial<GridSpan>
}

/**
 * Bento grid layout configuration
 */
export interface BentoGridConfig extends LayoutConfig {
  /**
   * Number of columns in the grid (default: 12)
   */
  columns?: 4 | 6 | 8 | 12

  /**
   * Auto-generate rows based on content
   */
  autoRows?: boolean

  /**
   * Minimum row height in pixels
   */
  minRowHeight?: number

  /**
   * Slot configurations
   */
  slots: BentoSlotConfig[]
}

/**
 * Props for BentoGrid component
 */
export interface BentoGridProps {
  /**
   * Layout configuration
   */
  config: BentoGridConfig

  /**
   * Slot content as a record of slot ID to React node
   */
  children: Record<string, React.ReactNode>

  /**
   * Additional container classes
   */
  className?: string
}

/**
 * Props for BentoSlot component
 */
export interface BentoSlotProps {
  /**
   * Slot configuration
   */
  config: BentoSlotConfig

  /**
   * Slot content
   */
  children: React.ReactNode

  /**
   * Additional slot classes
   */
  className?: string
}
