import type React from "react"
/**
 * Sidebar layout types
 * Classic application layout with collapsible sidebar
 */

import type { LayoutConfig } from "@/lib/layouts/types"

export type SidebarPosition = "left" | "right"
export type SidebarBehavior = "fixed" | "overlay" | "push"
export type SidebarWidth = "narrow" | "standard" | "wide" | number

export interface SidebarConfig extends LayoutConfig {
  /**
   * Sidebar position
   */
  position?: SidebarPosition

  /**
   * Sidebar width preset or custom pixel value
   */
  width?: SidebarWidth

  /**
   * Sidebar behavior on mobile
   */
  mobileBehavior?: SidebarBehavior

  /**
   * Whether sidebar is collapsible
   */
  collapsible?: boolean

  /**
   * Collapsed width (for icon-only mode)
   */
  collapsedWidth?: number

  /**
   * Breakpoint where sidebar becomes overlay
   */
  mobileBreakpoint?: "sm" | "md" | "lg"
}

export interface SidebarSlots {
  sidebar: React.ReactNode
  main: React.ReactNode
  header?: React.ReactNode
}

export interface SidebarLayoutProps {
  config: SidebarConfig
  children: SidebarSlots
  className?: string
}
