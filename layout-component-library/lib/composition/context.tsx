/**
 * Composition context provider
 * Manages shared state across composed components
 */

"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { CompositionContextValue } from "./types"

const CompositionContext = createContext<CompositionContextValue | undefined>(undefined)

export interface CompositionProviderProps {
  children: ReactNode
  initialRoute?: string
}

export function CompositionProvider({ children, initialRoute }: CompositionProviderProps) {
  const [activeRoute, setActiveRoute] = useState(initialRoute)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  return (
    <CompositionContext.Provider
      value={{
        activeRoute,
        setActiveRoute,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        theme,
        setTheme,
      }}
    >
      {children}
    </CompositionContext.Provider>
  )
}

export function useComposition() {
  const context = useContext(CompositionContext)
  if (!context) {
    throw new Error("useComposition must be used within CompositionProvider")
  }
  return context
}

// Optional hook that doesn't throw if outside provider
export function useCompositionOptional() {
  return useContext(CompositionContext)
}
