// Takes the README screenshots of the running app and reports browser problems.
//
//   pnpm build && pnpm start          (with NEXT_PUBLIC_API_URL pointing at a running API)
//   ADMIN_KEY=... pnpm screenshots    (BASE_URL defaults to http://localhost:3000)
//
// It drives the real UI against the real API: it selects a field, runs live and Time Machine
// assessments, registers a field by drawing on the satellite map, and saves the pictures to
// docs/img. Nothing here fakes data; a step that fails stops the script with the reason.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.OUT_DIR ?? join(here, "..", "..", "..", "docs", "img");
const base = process.env.BASE_URL ?? "http://localhost:3000";
const adminKey = process.env.ADMIN_KEY ?? "";
const RUN_TIMEOUT_MS = 8 * 60 * 1000;

const LIVE_FIELD = "Ludhiana Demo Wheat Field"; // sown 2026-10-15, so a live run has a crop stage
const REPLAY_FIELD = "Ludhiana wheat, sown Nov 2025"; // ripening on 2026-03-15; drawn below if missing

mkdirSync(out, { recursive: true });
const problems = [];
const noise = /GL Driver Message|GPU stall/; // headless software WebGL, not an app problem

const browser = await chromium.launch();

function watch(page, label) {
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !noise.test(m.text())) {
      problems.push(`[${label}] console.${m.type()}: ${m.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${String(e).slice(0, 300)}`));
  page.on("requestfailed", (r) => {
    // MapLibre cancels in-flight map tiles whenever the camera moves; that is not a failure.
    if (r.failure()?.errorText === "net::ERR_ABORTED" && r.url().includes("arcgisonline.com")) return;
    problems.push(`[${label}] requestfailed: ${r.url().slice(0, 140)} ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().includes("/api/")) problems.push(`[${label}] HTTP ${r.status()} ${r.url().slice(0, 140)}`);
  });
}

const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: join(out, name), ...opts });
  console.log("saved", name);
};

async function openPanel(page, name) {
  await page.getByRole("navigation", { name: "Workspace panels" }).getByRole("button", { name }).click();
}

async function selectField(page, name) {
  await openPanel(page, "Fields");
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForTimeout(2500); // fly to the field and let satellite tiles load
}

async function runAssessment(page, buttonText) {
  const started = Date.now();
  await page.getByRole("button", { name: new RegExp(`${buttonText}: `) }).click();
  return started;
}

async function waitForDone(page, started) {
  await page.getByText(/finished: |समाप्त|ਸਮਾਪਤ/).last().waitFor({ timeout: RUN_TIMEOUT_MS });
  await page.waitForTimeout(2500);
  console.log(`  assessment done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

const resultsColumn = (page) => page.locator("div.overflow-y-auto").last();

async function scrollResults(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
}

// ------------------------------------------------------------------ 1. landing
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  watch(page, "landing");
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.getByText("GET /health").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot(page, "01-landing.png", { fullPage: true });
  await page.context().close();
}

// ------------------------------------------------------------------ 2-7. desktop workspace
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
watch(page, "app");
await page.goto(base + "/app", { waitUntil: "networkidle" });
await page.getByRole("button", { name: new RegExp(LIVE_FIELD) }).first().waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);
await shot(page, "02-app-home.png");

// Register the replay field by drawing it on the map (skipped when it already exists).
const existing = await page.getByRole("button", { name: new RegExp(REPLAY_FIELD) }).count();
if (existing === 0) {
  console.log("drawing a new field on the satellite map");
  await selectField(page, LIVE_FIELD);
  await page.getByRole("button", { name: /Draw field/ }).click();
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  const cx = box.x + box.width / 2 + 90;
  const cy = box.y + box.height / 2;
  const corners = [[-70, -45], [70, -45], [70, 45], [-70, 45]];
  for (const [dx, dy] of corners.slice(0, 3)) {
    await page.mouse.click(cx + dx, cy + dy);
    await page.waitForTimeout(250);
  }
  await page.mouse.dblclick(cx + corners[3][0], cy + corners[3][1]);
  await page.waitForTimeout(800);
  await page.getByText("✓ Polygon drawn").waitFor({ timeout: 10000 });
  await page.getByLabel("District").selectOption("PB_LUDHIANA");
  await page.getByLabel("Field name").fill(REPLAY_FIELD);
  await page.getByLabel("Crop").selectOption("wheat");
  await page.getByLabel("Sowing date").fill("2025-11-10");
  await page.getByRole("button", { name: "Save field" }).click();
  await page.getByRole("button", { name: new RegExp(REPLAY_FIELD) }).first().waitFor({ timeout: 30000 });
  console.log("  field registered through the UI");
}

// Live run: trace while running, then the finished risk card.
await selectField(page, LIVE_FIELD);
await openPanel(page, "Assess");
let started = await runAssessment(page, "Assess risk");
await page.locator("ol li.trace-enter").nth(5).waitFor({ timeout: 60000 }); // a few events are in
await page.waitForTimeout(1500);
await shot(page, "03-trace-running.png");
await waitForDone(page, started);
await resultsColumn(page).evaluate((el) => (el.scrollTop = 0));
await page.waitForTimeout(600);
await shot(page, "04-risk-card.png");

// Hindi plan: switch language, run again, bring the plan into view.
await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "हिन्दी" }).click();
await openPanel(page, "Assess");
started = await runAssessment(page, "जोखिम जाँचें");
await waitForDone(page, started);
await scrollResults(page, '[data-slot="plan"]');
await shot(page, "05-plan-hindi.png");
await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "English" }).click();

// Time Machine: the March 2026 harvest-rain replay on the field that was ripening then.
await selectField(page, REPLAY_FIELD);
await openPanel(page, "Time Machine");
await page.getByRole("button", { name: /Mar 2026 harvest rain/ }).click();
started = await runAssessment(page, "Assess risk");
await waitForDone(page, started);
await resultsColumn(page).evaluate((el) => (el.scrollTop = 0));
await page.waitForTimeout(600);
await shot(page, "06-time-machine-mar-2026.png");

// Admin kill switch panel.
await openPanel(page, "Admin");
if (adminKey) {
  await page.getByLabel("Admin key").fill(adminKey);
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByText(/open_meteo_ensemble: /).waitFor({ timeout: 30000 });
}
await shot(page, "07-admin.png");
await ctx.close();

// ------------------------------------------------------------------ 8. mobile
{
  const mobile = await (
    await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  ).newPage();
  watch(mobile, "mobile");
  await mobile.goto(base + "/app", { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Fields", exact: true }).click(); // floating panel button
  await mobile.getByRole("dialog").getByRole("button", { name: new RegExp(LIVE_FIELD) }).click();
  await mobile.keyboard.press("Escape"); // close the Fields sheet
  await mobile.getByRole("button", { name: "Open menu" }).click(); // hamburger: the drawer
  await mobile.getByRole("dialog").getByRole("button", { name: "Assess", exact: true }).click();
  await mobile.waitForTimeout(700); // the drawer closes and the Assess sheet opens
  await mobile.getByRole("dialog").last().getByRole("button", { name: /Assess risk: / }).click();
  const t0 = Date.now();
  await mobile.getByText(/finished: /).last().waitFor({ timeout: RUN_TIMEOUT_MS });
  await mobile.waitForTimeout(2500);
  console.log(`  mobile assessment done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await mobile.locator('[data-slot="risk-dry_spell"]').first().scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(800);
  await shot(mobile, "08-app-mobile.png");
  await mobile.context().close();
}

await browser.close();
console.log(problems.length ? `\nBROWSER PROBLEMS (${problems.length}):\n${problems.join("\n")}` : "\nno console errors, warnings, page errors or failed API requests");
process.exit(problems.length ? 1 : 0);
