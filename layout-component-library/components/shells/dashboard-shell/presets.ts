/**
 * Dashboard Shell presets
 */

import type { DashboardShellConfig } from "./types"

export const dashboardShellPresets: Record<string, Partial<DashboardShellConfig>> = {
  standard: {
    id: "dashboard-shell-standard",
    name: "Standard Dashboard",
    description: "Classic dashboard with sidebar and metrics",
    sidebarWidth: 240,
    collapsible: true,
    headerHeight: 56,
    contentPadding: "md",
    showBreadcrumbs: true,
    mobileBreakpoint: "lg",
  },

  compact: {
    id: "dashboard-shell-compact",
    name: "Compact Dashboard",
    description: "Compact dashboard with minimal padding",
    sidebarWidth: 200,
    collapsible: true,
    headerHeight: 48,
    contentPadding: "sm",
    showBreadcrumbs: false,
    mobileBreakpoint: "md",
  },

  spacious: {
    id: "dashboard-shell-spacious",
    name: "Spacious Dashboard",
    description: "Spacious dashboard with generous padding",
    sidebarWidth: 280,
    collapsible: true,
    headerHeight: 64,
    contentPadding: "lg",
    showBreadcrumbs: true,
    mobileBreakpoint: "lg",
  },

  minimal: {
    id: "dashboard-shell-minimal",
    name: "Minimal Dashboard",
    description: "Minimal dashboard without sidebar",
    sidebarWidth: 0,
    collapsible: false,
    headerHeight: 56,
    contentPadding: "md",
    showBreadcrumbs: false,
    mobileBreakpoint: "lg",
  },
}
