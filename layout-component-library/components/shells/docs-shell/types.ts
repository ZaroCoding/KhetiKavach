/**
 * Docs Shell types
 * Documentation layout with table of contents
 */

import type { ReactNode } from "react"
import type { ShellConfig } from "@/lib/shells/types"

export interface DocsShellConfig extends ShellConfig {
  /**
   * Left sidebar width (table of contents)
   */
  sidebarWidth?: number

  /**
   * Right sidebar width (on this page)
   */
  asideWidth?: number

  /**
   * Whether to show right sidebar
   */
  showAside?: boolean

  /**
   * Header height in pixels
   */
  headerHeight?: number

  /**
   * Maximum content width
   */
  maxContentWidth?: number

  /**
   * Mobile breakpoint
   */
  mobileBreakpoint?: "sm" | "md" | "lg"
}

export interface DocsShellSlots {
  /**
   * Top navigation
   */
  header: ReactNode

  /**
   * Left sidebar (table of contents)
   */
  sidebar: ReactNode

  /**
   * Main documentation content
   */
  main: ReactNode

  /**
   * Right sidebar (on this page)
   */
  aside?: ReactNode
}

export interface DocsShellProps {
  config?: Partial<DocsShellConfig>
  children: DocsShellSlots
  className?: string
}
