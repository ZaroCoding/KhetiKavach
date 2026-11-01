import type React from "react"
/**
 * Core navigation system types
 * Foundation for all navigation patterns
 */

/**
 * Navigation item base structure
 */
export interface NavItem {
  /**
   * Unique identifier
   */
  id: string

  /**
   * Display label
   */
  label: string

  /**
   * Navigation href
   */
  href?: string

  /**
   * Icon component or name
   */
  icon?: React.ReactNode

  /**
   * Badge content (notifications, counts)
   */
  badge?: string | number

  /**
   * Whether item is disabled
   */
  disabled?: boolean

  /**
   * Whether item is currently active
   */
  active?: boolean

  /**
   * Child navigation items
   */
  children?: NavItem[]

  /**
   * Click handler
   */
  onClick?: () => void

  /**
   * External link indicator
   */
  external?: boolean

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Navigation group for organizing items
 */
export interface NavGroup {
  /**
   * Group identifier
   */
  id: string

  /**
   * Group label
   */
  label?: string

  /**
   * Items in this group
   */
  items: NavItem[]

  /**
   * Whether group is collapsible
   */
  collapsible?: boolean

  /**
   * Initial collapsed state
   */
  defaultCollapsed?: boolean
}

/**
 * Navigation configuration
 */
export interface NavConfig {
  /**
   * Navigation items or groups
   */
  items: (NavItem | NavGroup)[]

  /**
   * Orientation
   */
  orientation?: "horizontal" | "vertical"

  /**
   * Visual variant
   */
  variant?: "default" | "pills" | "underline" | "sidebar" | "minimal"

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg"

  /**
   * Whether to show icons
   */
  showIcons?: boolean

  /**
   * Whether to show badges
   */
  showBadges?: boolean

  /**
   * Collapse behavior for nested items
   */
  collapseBehavior?: "accordion" | "independent"

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Mobile navigation configuration
 */
export interface MobileNavConfig extends NavConfig {
  /**
   * Mobile menu type
   */
  type?: "drawer" | "fullscreen" | "dropdown"

  /**
   * Drawer position
   */
  position?: "left" | "right" | "top" | "bottom"

  /**
   * Whether to show overlay
   */
  showOverlay?: boolean

  /**
   * Close on item click
   */
  closeOnClick?: boolean
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  /**
   * Item label
   */
  label: string

  /**
   * Item href
   */
  href?: string

  /**
   * Whether this is the current page
   */
  current?: boolean

  /**
   * Icon
   */
  icon?: React.ReactNode
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /**
   * Current page (1-indexed)
   */
  currentPage: number

  /**
   * Total number of pages
   */
  totalPages: number

  /**
   * Items per page
   */
  pageSize?: number

  /**
   * Total number of items
   */
  totalItems?: number

  /**
   * Number of page buttons to show
   */
  siblingCount?: number

  /**
   * Show first/last buttons
   */
  showFirstLast?: boolean

  /**
   * Show previous/next buttons
   */
  showPrevNext?: boolean

  /**
   * Variant
   */
  variant?: "default" | "simple" | "compact"

  /**
   * Page change handler
   */
  onPageChange: (page: number) => void
}

/**
 * Tab configuration
 */
export interface TabConfig {
  /**
   * Tab items
   */
  items: NavItem[]

  /**
   * Currently active tab
   */
  activeTab?: string

  /**
   * Tab change handler
   */
  onTabChange?: (tabId: string) => void

  /**
   * Variant
   */
  variant?: "underline" | "pills" | "enclosed" | "soft"

  /**
   * Orientation
   */
  orientation?: "horizontal" | "vertical"

  /**
   * Size
   */
  size?: "sm" | "md" | "lg"

  /**
   * Whether tabs are full width
   */
  fullWidth?: boolean
}
