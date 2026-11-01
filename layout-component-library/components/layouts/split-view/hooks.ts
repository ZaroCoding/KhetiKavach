"use client"

import { useState, useEffect, useCallback } from "react"
import type { SplitViewState, PanelConfig } from "./types"

/**
 * Hook for managing split view panel state
 */
export function useSplitViewState(panels: PanelConfig[], persistState = false, storageKey = "split-view-state") {
  // Initialize state from panels config
  const getInitialState = useCallback((): SplitViewState => {
    // Try to load from localStorage if persistence is enabled
    if (persistState && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          // Fall through to default state
        }
      }
    }

    // Create default state from panel configs
    const panelStates: Record<string, { id: string; size: number; collapsed: boolean }> = {}
    panels.forEach((panel) => {
      panelStates[panel.id] = {
        id: panel.id,
        size: typeof panel.defaultSize === "number" ? panel.defaultSize : 300,
        collapsed: panel.defaultCollapsed || false,
      }
    })

    return { panels: panelStates }
  }, [panels, persistState, storageKey])

  const [state, setState] = useState<SplitViewState>(getInitialState)

  // Persist state to localStorage when it changes
  useEffect(() => {
    if (persistState && typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(state))
    }
  }, [state, persistState, storageKey])

  // Update panel size
  const updatePanelSize = useCallback((panelId: string, size: number) => {
    setState((prev) => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          size,
        },
      },
    }))
  }, [])

  // Toggle panel collapsed state
  const togglePanelCollapse = useCallback((panelId: string) => {
    setState((prev) => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          collapsed: !prev.panels[panelId].collapsed,
        },
      },
    }))
  }, [])

  // Reset to default state
  const resetState = useCallback(() => {
    setState(getInitialState())
  }, [getInitialState])

  return {
    state,
    updatePanelSize,
    togglePanelCollapse,
    resetState,
  }
}
