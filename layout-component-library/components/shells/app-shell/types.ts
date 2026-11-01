/**
 * App Shell types
 * Classic SaaS application layout with sidebar and top bar
 */

import type { ReactNode } from "react"
import type { ShellConfig } from "@/lib/shells/types"

export interface AppShellConfig extends ShellConfig {
  /**
   * Sidebar width in pixels
   */
  sidebarWidth?: number

  /**
   * Whether sidebar is collapsible
   */
  collapsible?: boolean

  /**
   * Collapsed sidebar width
   */
  collapsedWidth?: number

  /**
   * Header height in pixels
   */
  headerHeight?: number

  /**
   * Whether to show footer
   */
  showFooter?: boolean

  /**
   * Mobile breakpoint for sidebar
   */
  mobileBreakpoint?: "sm" | "md" | "lg"
}

export interface AppShellSlots {
  /**
   * Top navigation bar
   */
  header: ReactNode

  /**
   * Sidebar navigation
   */
  sidebar: ReactNode

  /**
   * Main content area
   */
  main: ReactNode

  /**
   * Optional footer
   */
  footer?: ReactNode
}

export interface AppShellProps {
  config?: Partial<AppShellConfig>
  children: AppShellSlots
  className?: string
}
