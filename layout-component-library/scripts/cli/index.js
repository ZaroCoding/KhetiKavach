#!/usr/bin/env node

const { spawn } = require("child_process")
const path = require("path")

const args = process.argv.slice(2)
const command = args[0]

if (!command || !["init", "add"].includes(command)) {
  console.error("Usage: npx layout-templates <init|add> [component-name]")
  console.error("\nCommands:")
  console.error("  init              Initialize layout-templates in your project")
  console.error("  add <component>   Add a component to your project")
  console.error("\nExamples:")
  console.error("  npx layout-templates init")
  console.error("  npx layout-templates add bento-grid")
  process.exit(1)
}

const scriptPath = path.join(__dirname, `${command}.ts`)

// Use tsx to run TypeScript files
const child = spawn("npx", ["tsx", scriptPath, ...args.slice(1)], {
  stdio: "inherit",
  shell: true,
})

child.on("exit", (code) => {
  process.exit(code || 0)
})
