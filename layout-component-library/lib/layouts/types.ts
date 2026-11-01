/**
 * Core layout system types
 * These types form the foundation for all layout templates
 */

/**
 * Responsive breakpoint values
 */
export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl"

/**
 * Spacing scale following Tailwind conventions
 */
export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24

/**
 * Base configuration for all layouts
 */
export interface LayoutConfig {
  /**
   * Unique identifier for the layout
   */
  id: string

  /**
   * Human-readable name
   */
  name: string

  /**
   * Layout description
   */
  description?: string

  /**
   * Gap between layout items
   */
  gap?: Spacing

  /**
   * Padding around the layout container
   */
  padding?: Spacing

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Slot configuration for content areas
 */
export interface SlotConfig {
  /**
   * Unique slot identifier
   */
  id: string

  /**
   * Slot label for documentation
   */
  label?: string

  /**
   * Additional CSS classes for the slot
   */
  className?: string

  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string
}

/**
 * Responsive configuration for slots
 */
export interface ResponsiveSlotConfig extends SlotConfig {
  /**
   * Breakpoint-specific overrides
   */
  responsive?: Partial<Record<Breakpoint, Partial<SlotConfig>>>
}

/**
 * Layout template metadata for registry
 */
export interface LayoutTemplate {
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
  category: "grid" | "sidebar" | "header" | "content" | "panel" | "scroll"

  /**
   * Complexity level
   */
  complexity: "simple" | "moderate" | "complex"

  /**
   * Available presets
   */
  presets?: string[]

  /**
   * Template version
   */
  version: string
}
