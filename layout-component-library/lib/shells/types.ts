/**
 * Core shell system types
 * Page shells are complete page structures with header, nav, content, footer
 */

import type { ReactNode } from "react"

/**
 * Base shell configuration
 */
export interface ShellConfig {
  /**
   * Unique identifier for the shell
   */
  id: string

  /**
   * Human-readable name
   */
  name: string

  /**
   * Shell description
   */
  description?: string

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Shell template metadata for registry
 */
export interface ShellTemplate {
  /**
   * Template identifier
   */
  id: string

  /**
   * Template name
   */
  name: string

  /**
   * Template description
   */
  description: string

  /**
   * Template category
   */
  category: "app" | "marketing" | "dashboard" | "docs" | "auth"

  /**
   * Use cases
   */
  useCases: string[]

  /**
   * Available presets
   */
  presets?: string[]

  /**
   * Template version
   */
  version: string
}

/**
 * Common shell slot types
 */
export interface ShellSlots {
  header?: ReactNode
  sidebar?: ReactNode
  main: ReactNode
  aside?: ReactNode
  footer?: ReactNode
}
