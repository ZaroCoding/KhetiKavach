/**
 * App Shell presets
 */

import type { AppShellConfig } from "./types"

export const appShellPresets: Record<string, Partial<AppShellConfig>> = {
  standard: {
    id: "app-shell-standard",
    name: "Standard App",
    description: "Classic SaaS app layout with standard sidebar",
    sidebarWidth: 280,
    collapsible: true,
    headerHeight: 64,
    showFooter: false,
    mobileBreakpoint: "lg",
  },

  compact: {
    id: "app-shell-compact",
    name: "Compact App",
    description: "Compact layout with narrow sidebar",
    sidebarWidth: 240,
    collapsible: true,
    collapsedWidth: 64,
    headerHeight: 56,
    showFooter: false,
    mobileBreakpoint: "md",
  },

  wide: {
    id: "app-shell-wide",
    name: "Wide App",
    description: "Wide layout with spacious sidebar",
    sidebarWidth: 320,
    collapsible: true,
    headerHeight: 72,
    showFooter: true,
    mobileBreakpoint: "lg",
  },

  minimal: {
    id: "app-shell-minimal",
    name: "Minimal App",
    description: "Minimal layout with icon-only sidebar",
    sidebarWidth: 64,
    collapsible: false,
    headerHeight: 56,
    showFooter: false,
    mobileBreakpoint: "md",
  },
}
