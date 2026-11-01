/**
 * Auth Shell types
 * Centered card layout for authentication pages
 */

import type { ReactNode } from "react"
import type { ShellConfig } from "@/lib/shells/types"

export interface AuthShellConfig extends ShellConfig {
  /**
   * Card width
   */
  cardWidth?: "sm" | "md" | "lg"

  /**
   * Background style
   */
  backgroundStyle?: "solid" | "gradient" | "pattern" | "image"

  /**
   * Whether to show logo
   */
  showLogo?: boolean

  /**
   * Whether to show footer links
   */
  showFooter?: boolean

  /**
   * Card elevation
   */
  elevation?: "none" | "sm" | "md" | "lg"
}

export interface AuthShellSlots {
  /**
   * Optional logo
   */
  logo?: ReactNode

  /**
   * Main auth form content
   */
  main: ReactNode

  /**
   * Optional footer links
   */
  footer?: ReactNode
}

export interface AuthShellProps {
  config?: Partial<AuthShellConfig>
  children: AuthShellSlots
  className?: string
}
