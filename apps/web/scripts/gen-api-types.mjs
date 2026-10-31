// Generates lib/api-types.ts from the API's OpenAPI document (GET /openapi.json).
//
// Usage: pnpm gen:api-types                      (reads http://localhost:8080)
//        API_URL=https://api.example pnpm gen:api-types
//
// The API must be running; this script does not start it. Output is committed so that
// typecheck does not depend on a running API.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const source = `${apiUrl}/openapi.json`;
const output = path.join(root, "lib", "api-types.ts");

// Run the package binary with node directly (no shell), so arguments are passed unchanged.
const requireFromRoot = createRequire(path.join(root, "package.json"));
const cli = path.join(path.dirname(requireFromRoot.resolve("openapi-typescript/package.json")), "bin", "cli.js");
const result = spawnSync(process.execPath, [cli, source, "-o", output], {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  console.error(`gen:api-types failed to start: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`gen:api-types failed (exit ${result.status}). Is the API running at ${apiUrl}?`);
  process.exit(result.status ?? 1);
}
console.log(`wrote ${path.relative(root, output)} from ${source}`);
