/**
 * Auth Shell presets
 */

import type { AuthShellConfig } from "./types"

export const authShellPresets: Record<string, Partial<AuthShellConfig>> = {
  standard: {
    id: "auth-shell-standard",
    name: "Standard Auth",
    description: "Classic auth layout with centered card",
    cardWidth: "md",
    backgroundStyle: "solid",
    showLogo: true,
    showFooter: true,
    elevation: "md",
  },

  gradient: {
    id: "auth-shell-gradient",
    name: "Gradient Auth",
    description: "Auth layout with gradient background",
    cardWidth: "md",
    backgroundStyle: "gradient",
    showLogo: true,
    showFooter: true,
    elevation: "lg",
  },

  pattern: {
    id: "auth-shell-pattern",
    name: "Pattern Auth",
    description: "Auth layout with dot pattern background",
    cardWidth: "sm",
    backgroundStyle: "pattern",
    showLogo: true,
    showFooter: true,
    elevation: "md",
  },

  minimal: {
    id: "auth-shell-minimal",
    name: "Minimal Auth",
    description: "Minimal auth layout without decorations",
    cardWidth: "sm",
    backgroundStyle: "solid",
    showLogo: false,
    showFooter: false,
    elevation: "sm",
  },
}
