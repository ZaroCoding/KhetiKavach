import type React from "react"
import type { LayoutConfig } from "@/lib/layouts/types"

/**
 * Panel position in the layout
 */
export type PanelPosition = "left" | "center" | "right" | "top" | "bottom"

/**
 * Panel resize direction
 */
export type ResizeDirection = "horizontal" | "vertical"

/**
 * Panel configuration
 */
export interface PanelConfig {
  /**
   * Unique panel identifier
   */
  id: string

  /**
   * Panel position
   */
  position: PanelPosition

  /**
   * Default width/height (in pixels or percentage)
   */
  defaultSize: number | string

  /**
   * Minimum size (in pixels)
   */
  minSize?: number

  /**
   * Maximum size (in pixels)
   */
  maxSize?: number

  /**
   * Whether panel is collapsible
   */
  collapsible?: boolean

  /**
   * Whether panel is resizable
   */
  resizable?: boolean

  /**
   * Default collapsed state
   */
  defaultCollapsed?: boolean

  /**
   * Panel label for accessibility
   */
  label?: string

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Split view layout configuration
 */
export interface SplitViewConfig extends LayoutConfig {
  /**
   * Layout direction
   */
  direction?: "horizontal" | "vertical"

  /**
   * Panel configurations
   */
  panels: PanelConfig[]

  /**
   * Whether to persist panel state to localStorage
   */
  persistState?: boolean

  /**
   * Storage key for persisted state
   */
  storageKey?: string

  /**
   * Whether to show resize handles
   */
  showHandles?: boolean

  /**
   * Handle size in pixels
   */
  handleSize?: number
}

/**
 * Panel state
 */
export interface PanelState {
  id: string
  size: number
  collapsed: boolean
}

/**
 * Split view state
 */
export interface SplitViewState {
  panels: Record<string, PanelState>
}

/**
 * Resize handle props
 */
export interface ResizeHandleProps {
  direction: ResizeDirection
  onResize: (delta: number) => void
  className?: string
  size?: number
}

/**
 * Panel props
 */
export interface PanelProps {
  config: PanelConfig
  children: React.ReactNode
  size: number
  collapsed: boolean
  onToggleCollapse?: () => void
  className?: string
}

/**
 * Split view props
 */
export interface SplitViewProps {
  config: SplitViewConfig
  children: React.ReactNode
  className?: string
  onStateChange?: (state: SplitViewState) => void
}
