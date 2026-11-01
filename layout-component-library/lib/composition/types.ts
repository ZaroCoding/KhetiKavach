/**
 * Composition system types
 * Defines how shells, navigation, layouts, and loading states compose together
 */

import type { ReactNode } from "react"

/**
 * Composition context for sharing state across composed components
 */
export interface CompositionContextValue {
  // Navigation state
  activeRoute?: string
  setActiveRoute?: (route: string) => void

  // Mobile menu state
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void

  // Sidebar state (for app shells)
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void

  // Theme
  theme?: "light" | "dark" | "system"
  setTheme?: (theme: "light" | "dark" | "system") => void
}

/**
 * Slot component props - accepts any React node
 */
export interface SlotProps {
  children: ReactNode
  className?: string
}

/**
 * Composition metadata for registry
 */
export interface CompositionPattern {
  id: string
  name: string
  description: string
  category: "shell" | "navigation" | "layout" | "loading"
  compatibleWith: string[] // IDs of compatible patterns
  example: string // Code example
}
