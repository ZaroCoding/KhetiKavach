/**
 * Marketing Shell presets
 */

import type { MarketingShellConfig } from "./types"

export const marketingShellPresets: Record<string, Partial<MarketingShellConfig>> = {
  standard: {
    id: "marketing-shell-standard",
    name: "Standard Marketing",
    description: "Classic marketing site with solid header",
    headerStyle: "solid",
    headerHeight: 64,
    stickyHeader: true,
    maxWidth: "2xl",
    showFooter: true,
  },

  transparent: {
    id: "marketing-shell-transparent",
    name: "Transparent Header",
    description: "Marketing site with transparent header over hero",
    headerStyle: "transparent",
    headerHeight: 80,
    stickyHeader: false,
    maxWidth: "full",
    showFooter: true,
  },

  blur: {
    id: "marketing-shell-blur",
    name: "Blur Header",
    description: "Modern marketing site with blur header",
    headerStyle: "blur",
    headerHeight: 64,
    stickyHeader: true,
    maxWidth: "xl",
    showFooter: true,
  },

  minimal: {
    id: "marketing-shell-minimal",
    name: "Minimal Marketing",
    description: "Minimal marketing site with compact header",
    headerStyle: "solid",
    headerHeight: 56,
    stickyHeader: true,
    maxWidth: "lg",
    showFooter: false,
  },
}
