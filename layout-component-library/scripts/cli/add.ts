#!/usr/bin/env node

import { promises as fs } from "fs"
import path from "path"
import https from "https"

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main"
const REGISTRY_URL = `${GITHUB_RAW_URL}/registry/registry.json`

interface ComponentConfig {
  name: string
  type: string
  files: string[]
  dependencies: string[]
  registryDependencies: string[]
}

interface Registry {
  [category: string]: {
    [component: string]: ComponentConfig
  }
}

async function fetchRegistry(): Promise<Registry> {
  return new Promise((resolve, reject) => {
    https
      .get(REGISTRY_URL, (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on("error", reject)
  })
}

async function fetchFile(filePath: string): Promise<string> {
  const url = `${GITHUB_RAW_URL}/${filePath}`
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => resolve(data))
      })
      .on("error", reject)
  })
}

async function readConfig() {
  try {
    const configPath = path.join(process.cwd(), "components.json")
    const config = await fs.readFile(configPath, "utf-8")
    return JSON.parse(config)
  } catch {
    return {
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
      },
    }
  }
}

async function writeFile(filePath: string, content: string) {
  const fullPath = path.join(process.cwd(), filePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, "utf-8")
}

async function addComponent(componentName: string) {
  console.log(`Adding ${componentName}...`)

  const registry = await fetchRegistry()
  const config = await readConfig()

  // Find component in registry
  let component: ComponentConfig | null = null
  let category = ""

  for (const [cat, components] of Object.entries(registry)) {
    if (components[componentName]) {
      component = components[componentName]
      category = cat
      break
    }
  }

  if (!component) {
    console.error(`Component "${componentName}" not found in registry`)
    process.exit(1)
  }

  console.log(`Found ${componentName} in ${category}`)

  // Download and write files
  for (const file of component.files) {
    console.log(`  Downloading ${file}...`)
    const content = await fetchFile(file)

    // Transform import paths based on config
    const transformed = content
      .replace(/@\/components/g, config.aliases?.components || "@/components")
      .replace(/@\/lib/g, config.aliases?.utils?.replace("/utils", "") || "@/lib")

    await writeFile(file, transformed)
    console.log(`  ✓ ${file}`)
  }

  // Install dependencies
  if (component.dependencies.length > 0) {
    console.log("\nInstalling dependencies...")
    const { execSync } = require("child_process")
    const deps = component.dependencies.join(" ")

    try {
      execSync(`npm install ${deps}`, { stdio: "inherit" })
      console.log("✓ Dependencies installed")
    } catch (e) {
      console.error("Failed to install dependencies. Please install manually:")
      console.error(`  npm install ${deps}`)
    }
  }

  // Install registry dependencies
  if (component.registryDependencies.length > 0) {
    console.log("\nInstalling registry dependencies...")
    for (const dep of component.registryDependencies) {
      await addComponent(dep)
    }
  }

  console.log(`\n✓ ${componentName} added successfully!`)
}

// CLI entry point
const args = process.argv.slice(2)
const componentName = args[0]

if (!componentName) {
  console.error("Usage: npx layout-templates add <component-name>")
  console.error("\nAvailable components:")
  console.error("  Layouts: bento-grid, sidebar, split, stack, cluster, split-view")
  console.error("  Shells: app-shell, marketing-shell, dashboard-shell, docs-shell, auth-shell")
  console.error("  Navigation: top-nav, sidebar-nav, mobile-nav, breadcrumbs, tabs, pagination")
  console.error("  Sections: hero, features, pricing, cta")
  console.error("  Loading: skeleton, spinner, async-container, progressive")
  process.exit(1)
}

addComponent(componentName).catch((error) => {
  console.error("Error:", error.message)
  process.exit(1)
})
