/**
 * Docs Shell presets
 */

import type { DocsShellConfig } from "./types"

export const docsShellPresets: Record<string, Partial<DocsShellConfig>> = {
  standard: {
    id: "docs-shell-standard",
    name: "Standard Docs",
    description: "Classic docs layout with left TOC and right sidebar",
    sidebarWidth: 280,
    asideWidth: 240,
    showAside: true,
    headerHeight: 64,
    maxContentWidth: 800,
    mobileBreakpoint: "lg",
  },

  wide: {
    id: "docs-shell-wide",
    name: "Wide Docs",
    description: "Wide docs layout with spacious content area",
    sidebarWidth: 320,
    asideWidth: 280,
    showAside: true,
    headerHeight: 64,
    maxContentWidth: 1000,
    mobileBreakpoint: "lg",
  },

  compact: {
    id: "docs-shell-compact",
    name: "Compact Docs",
    description: "Compact docs layout without right sidebar",
    sidebarWidth: 240,
    asideWidth: 0,
    showAside: false,
    headerHeight: 56,
    maxContentWidth: 720,
    mobileBreakpoint: "md",
  },

  minimal: {
    id: "docs-shell-minimal",
    name: "Minimal Docs",
    description: "Minimal docs layout with narrow sidebars",
    sidebarWidth: 220,
    asideWidth: 200,
    showAside: true,
    headerHeight: 56,
    maxContentWidth: 680,
    mobileBreakpoint: "lg",
  },
}
