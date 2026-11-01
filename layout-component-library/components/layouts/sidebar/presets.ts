/**
 * Sidebar layout presets
 */

import type { SidebarConfig } from "./types"

export const sidebarPresets: Record<string, SidebarConfig> = {
  standard: {
    id: "sidebar-standard",
    name: "Standard Sidebar",
    description: "Classic left sidebar with standard width",
    position: "left",
    width: "standard",
    collapsible: true,
    mobileBreakpoint: "lg",
  },

  narrow: {
    id: "sidebar-narrow",
    name: "Narrow Sidebar",
    description: "Compact sidebar for icon-based navigation",
    position: "left",
    width: "narrow",
    collapsible: false,
    mobileBreakpoint: "md",
  },

  wide: {
    id: "sidebar-wide",
    name: "Wide Sidebar",
    description: "Wide sidebar for rich navigation content",
    position: "left",
    width: "wide",
    collapsible: true,
    mobileBreakpoint: "lg",
  },

  right: {
    id: "sidebar-right",
    name: "Right Sidebar",
    description: "Sidebar positioned on the right side",
    position: "right",
    width: "standard",
    collapsible: true,
    mobileBreakpoint: "lg",
  },
}
