/**
 * Dashboard Shell types
 * Data-heavy interface optimized for metrics and charts
 */

import type { ReactNode } from "react"
import type { ShellConfig } from "@/lib/shells/types"

export interface DashboardShellConfig extends ShellConfig {
  /**
   * Sidebar width in pixels
   */
  sidebarWidth?: number

  /**
   * Whether sidebar is collapsible
   */
  collapsible?: boolean

  /**
   * Header height in pixels
   */
  headerHeight?: number

  /**
   * Content padding
   */
  contentPadding?: "none" | "sm" | "md" | "lg"

  /**
   * Whether to show breadcrumbs
   */
  showBreadcrumbs?: boolean

  /**
   * Mobile breakpoint
   */
  mobileBreakpoint?: "sm" | "md" | "lg"
}

export interface DashboardShellSlots {
  /**
   * Top bar with actions
   */
  header: ReactNode

  /**
   * Sidebar navigation
   */
  sidebar: ReactNode

  /**
   * Optional breadcrumbs
   */
  breadcrumbs?: ReactNode

  /**
   * Main dashboard content
   */
  main: ReactNode
}

export interface DashboardShellProps {
  config?: Partial<DashboardShellConfig>
  children: DashboardShellSlots
  className?: string
}
