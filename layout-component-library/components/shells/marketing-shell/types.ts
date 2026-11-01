/**
 * Marketing Shell types
 * Landing page structure with top nav and sections
 */

import type { ReactNode } from "react"
import type { ShellConfig } from "@/lib/shells/types"

export interface MarketingShellConfig extends ShellConfig {
  /**
   * Header style
   */
  headerStyle?: "transparent" | "solid" | "blur"

  /**
   * Header height in pixels
   */
  headerHeight?: number

  /**
   * Whether header is sticky
   */
  stickyHeader?: boolean

  /**
   * Maximum content width
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"

  /**
   * Whether to show footer
   */
  showFooter?: boolean
}

export interface MarketingShellSlots {
  /**
   * Top navigation
   */
  nav: ReactNode

  /**
   * Hero section
   */
  hero: ReactNode

  /**
   * Main content sections
   */
  main: ReactNode

  /**
   * Optional footer
   */
  footer?: ReactNode
}

export interface MarketingShellProps {
  config?: Partial<MarketingShellConfig>
  children: MarketingShellSlots
  className?: string
}
