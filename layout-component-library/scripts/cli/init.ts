#!/usr/bin/env node

import { promises as fs } from "fs"
import path from "path"

const DEFAULT_CONFIG = {
  $schema: "https://ui.shadcn.com/schema.json",
  style: "default",
  rsc: true,
  tsx: true,
  tailwind: {
    config: "tailwind.config.ts",
    css: "app/globals.css",
    baseColor: "slate",
    cssVariables: true,
  },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
  },
}

async function init() {
  console.log("Initializing layout-templates...")

  const configPath = path.join(process.cwd(), "components.json")

  try {
    await fs.access(configPath)
    console.log("components.json already exists. Skipping...")
  } catch {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8")
    console.log("✓ Created components.json")
  }

  // Create directories
  const dirs = [
    "components/layouts",
    "components/shells",
    "components/navigation",
    "components/sections",
    "components/loading",
    "lib/layouts",
    "lib/shells",
    "lib/navigation",
    "lib/sections",
    "lib/loading",
  ]

  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir)
    await fs.mkdir(fullPath, { recursive: true })
  }

  console.log("✓ Created directory structure")

  // Create lib/utils.ts if it doesn't exist
  const utilsPath = path.join(process.cwd(), "lib/utils.ts")
  try {
    await fs.access(utilsPath)
  } catch {
    const utilsContent = `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`
    await fs.writeFile(utilsPath, utilsContent, "utf-8")
    console.log("✓ Created lib/utils.ts")
  }

  console.log("\n✓ Initialization complete!")
  console.log("\nNext steps:")
  console.log("  1. Run: npx layout-templates add <component-name>")
  console.log("  2. Example: npx layout-templates add bento-grid")
  console.log("\nAvailable components:")
  console.log("  Layouts: bento-grid, sidebar, split, stack, cluster, split-view")
  console.log("  Shells: app-shell, marketing-shell, dashboard-shell, docs-shell, auth-shell")
  console.log("  Navigation: top-nav, sidebar-nav, mobile-nav, breadcrumbs, tabs, pagination")
  console.log("  Sections: hero, features, pricing, cta")
  console.log("  Loading: skeleton, spinner, async-container, progressive")
}

init().catch((error) => {
  console.error("Error:", error.message)
  process.exit(1)
})
