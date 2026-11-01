// Records app scenes 2-8 of the silent demo from the real running app.
//
//   node demo/record.js [--base http://localhost:3000] [--api http://localhost:8000]
//
// One browser page stays open across the scenes so results carry over, with one
// page.screencast clip per scene in demo/clips/NN.webm. Timing facts for demo/assemble.js go to
// demo/clips/NN.json and run facts (assessment ids, created fields) to demo/clips/run.json.
// The ADMIN_KEY is read from apps/api/.env, typed only into the masked admin field and never logged.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(require.resolve("playwright", { paths: [path.join(ROOT, "apps/web")] }));

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3100");
const API = arg("api", "http://localhost:8010");
const CLIPS = path.join(__dirname, "clips");
const SCENES = Object.fromEntries(
  JSON.parse(fs.readFileSync(path.join(__dirname, "scenes.json"), "utf8")).scenes.map((s) => [s.n, s]),
);
const VIDEO = { width: 1920, height: 1080 };
const MAX_SPEED = 3;
const RUN_TIMEOUT = 5 * 60 * 1000;
const KILL_SOURCE = "open_meteo_ensemble";

const LIVE_FIELD = "Alamgir wheat field";
const MAR_FIELD = "Ludhiana wheat, sown Nov 2025";
const AUG_FIELD = "Dharwad soybean, sown Jun 2023";
const KILL_FIELD = "Ludhiana wheat, no cached data";

function adminKey() {
  const line = fs
    .readFileSync(path.join(ROOT, "apps/api/.env"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("ADMIN_KEY="));
  if (!line) throw new Error("ADMIN_KEY is not set in apps/api/.env");
  return line.slice("ADMIN_KEY=".length).replace(/^"|"$/g, "").trim();
}

const run = { base: BASE, api: API, startedAt: new Date().toISOString(), assessments: {}, createdFields: [], problems: [], toastErrors: [] };
const saveRun = () => fs.writeFileSync(path.join(CLIPS, "run.json"), JSON.stringify(run, null, 2));

// Injected once per document, outside <body> so the zoom transform never moves it.
function installOverlay() {
  if (document.getElementById("kk-overlay")) return;
  const root = document.createElement("div");
  root.id = "kk-overlay";
  root.innerHTML = `
    <style>
      nextjs-portal { display: none !important; }
      #kk-overlay * { box-sizing: border-box; }
      #kk-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 44px; height: 44px; margin: -22px 0 0 -22px; }
      #kk-cursor .halo { position: absolute; inset: 0; border-radius: 50%; background: rgba(255, 209, 102, .45); border: 2px solid rgba(217, 119, 6, .9); }
      #kk-cursor .dot { position: absolute; left: 18px; top: 18px; width: 8px; height: 8px; border-radius: 50%; background: #b45309; }
      #kk-cursor.down .halo { background: rgba(217, 119, 6, .65); transform: scale(.75); transition: transform .08s; }
      #kk-ring { position: fixed; z-index: 2147483646; pointer-events: none; border: 3px solid #d97706; border-radius: 10px; box-shadow: 0 0 0 4000px rgba(20, 20, 20, .22), 0 0 14px rgba(217, 119, 6, .9); opacity: 0; transition: opacity .3s; }
      #kk-third { position: fixed; left: 24px; bottom: 20px; z-index: 2147483645; pointer-events: none; padding: 7px 14px; border-radius: 6px; background: rgba(32, 40, 28, .88); color: #fff; font: 600 14px/1.2 "Segoe UI", Arial, sans-serif; border-left: 4px solid #f59e0b; }
      li.kk-flash { outline: 2px solid #d97706; outline-offset: 1px; border-radius: 3px; }
      input[aria-label="Admin key"] { color: transparent !important; caret-color: transparent; }
    </style>
    <div id="kk-ring"></div>
    <div id="kk-third"></div>
    <div id="kk-cursor"><div class="halo"></div><div class="dot"></div></div>`;
  document.documentElement.appendChild(root);
  const cursor = root.querySelector("#kk-cursor");
  window.addEventListener("mousemove", (e) => { cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; }, true);
  window.addEventListener("mousedown", () => cursor.classList.add("down"), true);
  window.addEventListener("mouseup", () => cursor.classList.remove("down"), true);
  window.__kkToasts = [];
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches?.("li.trace-enter")) {
          n.classList.add("kk-flash");
          setTimeout(() => n.classList.remove("kk-flash"), 700);
        }
        const toast = n.matches?.('[data-sonner-toast][data-type="error"]') ? n : n.querySelector?.('[data-sonner-toast][data-type="error"]');
        if (toast) window.__kkToasts.push(toast.textContent);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

let page;
let mouse = { x: 720, y: 400 };
let current = null;

const sleep = (ms) => page.waitForTimeout(ms);

async function moveTo(x, y) {
  const dist = Math.hypot(x - mouse.x, y - mouse.y);
  const steps = Math.max(8, Math.min(18, Math.round(dist / 40)));
  const from = { ...mouse };
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
  }
  mouse = { x, y };
}

async function hover(locator) {
  await locator.waitFor({ state: "visible", timeout: 30000 });
  await locator.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
  const b = await locator.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(200);
}

async function click(locator) {
  await hover(locator);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(150);
}

async function typeHuman(text, delay = 75) {
  await page.keyboard.type(text, { delay });
}

async function ring(locator) {
  const b = await locator.boundingBox();
  if (!b) return;
  await moveTo(Math.min(1400, b.x + b.width + 26), b.y + b.height / 2); // the pointer rests beside the element, not on it
  await page.evaluate((r) => {
    const el = document.getElementById("kk-ring");
    Object.assign(el.style, { left: `${r.x - 6}px`, top: `${r.y - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px`, opacity: 1 });
  }, b);
}

const unring = () => page.evaluate(() => { document.getElementById("kk-ring").style.opacity = 0; });

async function unzoom() {
  await page.evaluate(() => {
    document.body.style.transition = "transform .6s ease";
    document.body.style.transform = "";
  });
  await sleep(650);
}

/** Bring an element to the centre, zoom toward it when it is small, then outline it. */
async function spotlight(locator, { zoom = 1.5, center = true } = {}) {
  await unring();
  await locator.waitFor({ state: "visible", timeout: 30000 });
  if (center) await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await sleep(center ? 550 : 100);
  await locator.evaluate((el, maxZoom) => {
    document.documentElement.style.overflow = "hidden";
    const body = document.body;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const prev = body.style.transform;
    body.style.transition = "none";
    body.style.transform = "";
    body.style.transformOrigin = "0 0";
    const r = el.getBoundingClientRect();
    const s = Math.max(1, Math.min(maxZoom, (0.86 * W) / r.width, (0.8 * H) / r.height));
    const clamp = (v, lo) => Math.max(lo, Math.min(0, v));
    const tx = clamp(W / 2 - (r.left + r.width / 2) * s, W - W * s);
    const ty = clamp(H / 2 - (r.top + r.height / 2) * s, H - H * s);
    body.style.transform = prev;
    void body.offsetWidth;
    body.style.transition = "transform .6s ease";
    body.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }, zoom);
  await sleep(650);
  await ring(locator);
}

class Scene {
  constructor(n) {
    this.n = n;
    this.def = SCENES[n];
    this.t0 = 0;
    this.waits = [];
    this.k = 1;
    this.name = String(n).padStart(2, "0");
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  async start() {
    current = this;
    await page.evaluate((title) => { document.getElementById("kk-third").textContent = title; }, this.def.title);
    await page.screencast.start({ path: path.join(CLIPS, `${this.name}.webm`), size: VIDEO, fps: 30 });
    this.t0 = Date.now();
    console.log(`scene ${this.n}: ${this.def.title}`);
  }

  /** Runs a real wait (an SSE-driven agent run); assemble.js may speed up exactly this part. */
  async waiting(fn) {
    const start = this.now();
    const out = await fn();
    this.waits.push({ start, end: this.now() });
    return out;
  }

  /** Seconds left against the target, counting waits at the top speed they could be played. */
  remaining() {
    const waited = this.waits.reduce((sum, w) => sum + (w.end - w.start), 0);
    return this.def.seconds - (this.now() - waited + waited / MAX_SPEED);
  }

  /** Scales the remaining reading pauses to fit: `nominal` ms of pauses, `busy` s of actions. */
  fit(nominalMs, busySeconds) {
    const left = this.remaining() - busySeconds;
    this.k = Math.max(0.55, Math.min(2.2, (left * 1000) / nominalMs));
    console.log(`  fit: ${left.toFixed(1)} s for ${nominalMs} ms of pauses, k=${this.k.toFixed(2)}`);
  }

  pause(ms) {
    return sleep(ms * this.k);
  }

  async stop() {
    // Hold to the target when nothing was sped up, so the assembly rarely has to freeze a frame.
    const left = this.remaining();
    if (left > 0.1 && this.waits.length === 0) await sleep(left * 1000);
    const duration = this.now();
    await page.screencast.stop();
    fs.writeFileSync(path.join(CLIPS, `${this.name}.json`), JSON.stringify({ n: this.n, target: this.def.seconds, duration, waits: this.waits }, null, 2));
    const toasts = await page.evaluate(() => window.__kkToasts.splice(0));
    if (toasts.length) run.toastErrors.push({ scene: this.n, toasts });
    console.log(`  clip ${duration.toFixed(1)} s (target ${this.def.seconds}), waits ${this.waits.map((w) => (w.end - w.start).toFixed(1)).join(", ") || "none"}`);
    saveRun();
  }
}

const panel = (name) => page.getByRole("navigation", { name: "Workspace panels" }).getByRole("button", { name, exact: true });
const fieldButton = (name) => page.getByRole("button", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first();
const traceList = () => page.locator("ol.font-mono");
const traceLine = (re) => page.locator("ol.font-mono > li.trace-enter").filter({ hasText: re });
const slot = (id) => page.locator(`[data-slot="${id}"]`).first();

/** Clicks the assess button, then follows the real SSE stream to its done event and the result. */
async function assess(scene, buttonRe, tag) {
  const response = page.waitForResponse((r) => r.url().endsWith("/api/assessments") && r.request().method() === "POST", { timeout: 60000 });
  await click(page.getByRole("button", { name: buttonRe }));
  await scene.waiting(async () => {
    const body = await (await response).json();
    run.assessments[tag] = body.assessment_id;
    console.log(`  ${tag}: ${body.assessment_id}`);
    await traceLine(/finished: /).waitFor({ timeout: RUN_TIMEOUT });
    await page.locator('[data-slot="plan"]').first().waitFor({ timeout: 30000 });
  });
  await sleep(500);
}

async function typeDate(locator, iso) {
  const [y, m, d] = iso.split("-");
  await hover(locator);
  const b = await locator.boundingBox();
  await page.mouse.click(b.x + 14, b.y + b.height / 2);
  await typeHuman(`${d}${m}${y}`, 90);
}

async function drawOnMap(corners) {
  await click(page.getByRole("button", { name: /Draw field/ }));
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const [dx, dy] of corners.slice(0, -1)) {
    await moveTo(cx + dx, cy + dy);
    await sleep(120);
    await page.mouse.click(cx + dx, cy + dy);
    await sleep(260);
  }
  const [lx, ly] = corners[corners.length - 1];
  await moveTo(cx + lx, cy + ly);
  await sleep(120);
  await page.mouse.dblclick(cx + lx, cy + ly);
  await sleep(350);
}

// ------------------------------------------------------------------ scenes

async function scene2() {
  const sc = new Scene(2);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(installOverlay);
  await page.getByText("GET /health").first().waitFor({ timeout: 60000 });
  await sc.start();
  await page.mouse.move(mouse.x, mouse.y);
  await sleep(4500);
  await moveTo(620, 330);
  await sleep(2500);
  await page.evaluate(() => document.getElementById("status").scrollIntoView({ behavior: "smooth", block: "start" }));
  await sleep(1800);
  await spotlight(page.locator("#status div.grid").first(), { zoom: 1.15 });
  await sleep(5500);
  await unring();
  await unzoom();
  await sc.stop();
}

async function scene3() {
  const sc = new Scene(3);
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.evaluate(installOverlay);
  await page.mouse.move(mouse.x, mouse.y);
  await fieldButton(MAR_FIELD).waitFor({ timeout: 60000 });
  await sleep(1200);
  await sc.start();
  await sleep(1000);
  const district = page.getByLabel("District");
  await hover(district);
  await district.selectOption("PB_LUDHIANA");
  await sleep(1700);
  await click(page.getByLabel("Search a village"));
  await typeHuman("Alamgir");
  await click(page.getByRole("button", { name: "Find", exact: true }));
  const place = page.locator("button.text-sky-600").filter({ hasText: /Alamgir.*Ludhiana/i }).first();
  await place.waitFor({ timeout: 20000 });
  await sleep(600);
  await click(place);
  await sleep(2600); // the map flies in and real satellite tiles load
  await drawOnMap([[150, -192], [216, -194], [218, -130], [151, -128]]); // a real parcel beside the village
  await page.getByText("✓ Polygon drawn").waitFor({ timeout: 10000 });
  await sleep(600);
  await click(page.getByLabel("Field name"));
  await typeHuman(LIVE_FIELD, 55);
  await typeDate(page.getByLabel("Sowing date"), "2026-10-20");
  await sleep(500);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/fields") && r.request().method() === "POST", { timeout: 30000 });
  await click(page.getByRole("button", { name: "Save field" }));
  const created = await (await response).json();
  run.createdFields.push({ id: created.id, short_code: created.short_code, name: created.name });
  run.liveField = created;
  await fieldButton(LIVE_FIELD).waitFor({ timeout: 10000 });
  await spotlight(fieldButton(LIVE_FIELD), { zoom: 1 });
  await sleep(1500);
  await unring();
  await sc.stop();
}

async function scene4() {
  const sc = new Scene(4);
  await sc.start();
  await sleep(500);
  await click(panel("Assess"));
  await sleep(1200);
  await spotlight(traceList(), { zoom: 1.35, center: false });
  await unring();
  await unzoom();
  await assess(sc, /Assess risk: /, "live_en");
  await spotlight(traceList(), { zoom: 1.45, center: false });
  sc.fit(9000, 3.5);
  await sc.pause(1000);
  for (const re of [/ecmwf_ensemble/, /gefs_ensemble/, /quality_gate/, /verify/]) {
    const line = traceLine(re).first();
    if (await line.count()) {
      await line.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await sleep(150);
      await ring(line);
      await sc.pause(2000);
    }
  }
  await unring();
  await unzoom();
  await sc.stop();
}

async function scene5() {
  const sc = new Scene(5);
  await page.locator("div.overflow-y-auto div.scroll-mt-3").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await sc.start();
  await sleep(900);
  const tile = slot("risk-dry_spell");
  await spotlight(tile, { zoom: 1.9 });
  await sleep(2800);
  await ring(tile.getByText(/90% range/).first().locator(".."));
  await sleep(2600);
  await ring(tile.getByText(/ECMWF \d+\/\d+/).first());
  await sleep(2600);
  await ring(tile.getByText(/usual for this window/).first().locator(".."));
  await sleep(2800);
  await unzoom();
  await spotlight(slot("spread"), { zoom: 1.6 });
  await sleep(3200);
  if (await slot("ndvi").count()) {
    await spotlight(slot("ndvi"), { zoom: 1.6 });
    await sleep(3200);
  }
  await unzoom();
  await spotlight(slot("sources"), { zoom: 1.35 });
  await sleep(3400);
  await unring();
  await unzoom();
  await sc.stop();
}

async function scene6() {
  const sc = new Scene(6);
  await sc.start();
  await spotlight(slot("plan"), { zoom: 1.45 });
  await sleep(2600);
  await ring(page.locator('[data-slot="plan"] .text-sky-600').first());
  await sleep(3000);
  await unring();
  await unzoom();
  const languages = page.getByRole("group", { name: "Language" });
  await spotlight(languages, { zoom: 1, center: false });
  await hover(languages.getByRole("button", { name: "ਪੰਜਾਬੀ" }));
  await sleep(700);
  await click(languages.getByRole("button", { name: "हिन्दी" }));
  await sleep(700);
  await unring();
  await click(panel("Assess"));
  await page.locator("div.overflow-y-auto").last().evaluate((el) => el.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(500);
  await assess(sc, /जोखिम जाँचें: /, "live_hi");
  sc.fit(4000, 2);
  await spotlight(slot("plan"), { zoom: 1.45 });
  await sc.pause(4000);
  await unring();
  await unzoom();
  await sc.stop();
}

async function scene7() {
  const languages = page.getByRole("group", { name: "Language" });
  await languages.getByRole("button", { name: "English" }).click();
  await panel("Fields").click();
  await sleep(400);
  const sc = new Scene(7);
  await sc.start();
  await sleep(300);
  await click(fieldButton(MAR_FIELD));
  await sleep(1100);
  await click(panel("Time Machine"));
  await sleep(500);
  await click(page.getByRole("button", { name: /Mar 2026 harvest rain/ }));
  await sleep(400);
  await assess(sc, /Assess risk: /, "replay_mar_2026");
  const banner = page.locator("div.border-amber-300").first();
  await spotlight(banner, { zoom: 1.45 });
  await sleep(3200);
  await unzoom();
  await spotlight(slot("risk-harvest_rain"), { zoom: 1.75 });
  await sleep(3600);
  await unring();
  await unzoom();
  await page.locator("div.overflow-y-auto").last().evaluate((el) => el.scrollTo({ top: 0, behavior: "smooth" }));
  await click(panel("Fields"));
  await sleep(300);
  await click(fieldButton(AUG_FIELD));
  await sleep(1000);
  await click(panel("Time Machine"));
  await sleep(400);
  await click(page.getByRole("button", { name: /Aug 2023 drought/ }));
  await sleep(300);
  await assess(sc, /Assess risk: /, "replay_aug_2023");
  sc.fit(5000, 2);
  await spotlight(page.locator("div.border-amber-300").first(), { zoom: 1.45 });
  await sc.pause(2500);
  await unzoom();
  await spotlight(slot("risk-dry_spell"), { zoom: 1.75 });
  await sc.pause(2500);
  await unring();
  await unzoom();
  await sc.stop();
}

async function setKill(key, disabled) {
  const res = await fetch(`${API}/api/admin/sources/${KILL_SOURCE}/${disabled ? "disable" : "enable"}`, { method: "POST", headers: { "x-admin-key": key } });
  if (!res.ok) throw new Error(`kill switch ${disabled ? "disable" : "enable"} returned HTTP ${res.status}`);
  run.killSwitch = { source: KILL_SOURCE, disabled, at: new Date().toISOString() };
}

async function scene8(key) {
  // Off camera: back to live mode, and a Ludhiana field with no cached weather so the
  // chain really has to fall back. Coordinates shift each run to keep the cache empty.
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.evaluate(installOverlay);
  await page.mouse.move(mouse.x, mouse.y);
  await fieldButton(KILL_FIELD).waitFor({ timeout: 60000 });
  await sleep(800);
  const sc = new Scene(8);
  await sc.start();
  await sleep(300);
  await click(fieldButton(KILL_FIELD));
  await sleep(1000);
  await drawOnMap([[-180, -60], [-60, 40], [-60, -60], [-180, 40]]);
  await page.getByText("✓ Polygon drawn").waitFor({ timeout: 10000 });
  await page.getByLabel("District").selectOption("PB_LUDHIANA");
  await page.getByLabel("Sowing date").fill("2026-10-20");
  await sleep(300);
  await click(page.getByRole("button", { name: "Save field" }));
  const alert = page.getByRole("alert").filter({ hasText: /./ }).first();
  await alert.waitFor({ timeout: 15000 });
  run.rejectionReason = await alert.textContent();
  await spotlight(alert, { zoom: 1.6 });
  await sleep(2600);
  await unring();
  await unzoom();
  await click(page.getByRole("button", { name: "Clear", exact: true }));
  await click(panel("Admin"));
  const keyInput = page.getByLabel("Admin key");
  await click(keyInput);
  await keyInput.fill(key);
  await click(page.getByRole("button", { name: "Load", exact: true }));
  const chip = page.getByRole("button", { name: new RegExp(`${KILL_SOURCE}: `) });
  await chip.waitFor({ timeout: 30000 });
  await sleep(500);
  await click(chip);
  await page.getByRole("button", { name: `${KILL_SOURCE}: OFF` }).waitFor({ timeout: 15000 });
  run.killSwitch = { source: KILL_SOURCE, disabled: true, at: new Date().toISOString() };
  await sleep(700);
  await click(panel("Assess"));
  await sleep(300);
  try {
    await assess(sc, /Assess risk: /, "kill_switch");
  } finally {
    await setKill(key, false); // back on the moment the run ends
  }
  await spotlight(traceList(), { zoom: 1.45, center: false });
  sc.fit(5500, 1.5);
  const fallback = traceLine(/→/).filter({ hasText: /^.*fallback/ }).last();
  await fallback.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await sleep(200);
  await ring(fallback);
  await sc.pause(3000);
  const first = traceLine(/fallback/).first();
  await first.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await sleep(200);
  await ring(first);
  await sc.pause(2500);
  await unring();
  await unzoom();
  await sc.stop();
}

// ------------------------------------------------------------------ main

async function preflight() {
  const health = await fetch(`${API}/health`);
  const body = await health.json();
  const districts = await (await fetch(`${API}/api/districts`)).json();
  const ludhiana = districts.find((d) => d.code === "PB_LUDHIANA");
  if (health.status !== 200 || body.db?.status !== "ok" || !(ludhiana?.plan_chunks > 0)) {
    throw new Error(`preflight failed: health ${health.status}, db ${body.db?.status}, plan_chunks ${ludhiana?.plan_chunks}`);
  }
  run.preflight = { health: health.status, overall: body.status, db: body.db.status, plan_chunks: ludhiana.plan_chunks };
  console.log("preflight ok", run.preflight);
}

/** The kill-switch field: a real Ludhiana polygon whose weather was never fetched. */
async function createKillField() {
  const shift = (Date.now() % 9973) / 9973;
  const lon = 75.92 + shift * 0.12;
  const lat = 30.86 + shift * 0.06;
  const res = await fetch(`${API}/api/fields`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: KILL_FIELD,
      crop: "wheat",
      sowing_date: "2026-10-20",
      district_code: "PB_LUDHIANA",
      geometry: { type: "Polygon", coordinates: [[[lon, lat], [lon + 0.003, lat], [lon + 0.003, lat + 0.0025], [lon, lat + 0.0025], [lon, lat]]] },
    }),
  });
  if (!res.ok) throw new Error(`could not create the kill-switch field: HTTP ${res.status}`);
  const f = await res.json();
  run.createdFields.push({ id: f.id, short_code: f.short_code, name: f.name });
  run.killField = f;
}

async function main() {
  fs.mkdirSync(CLIPS, { recursive: true });
  const key = adminKey();
  await preflight();
  await createKillField();
  saveRun();
  // A browser-level scale gives a 1440x810 layout painted at a true 1920x1080, so the UI stays legible.
  const browser = await chromium.launch({ channel: "chromium", slowMo: 12, args: ["--force-device-scale-factor=1.3333333", "--window-size=1454,903"] });
  const context = await browser.newContext({ viewport: null, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  page = await context.newPage();
  const noise = /GL Driver Message|GPU stall|Download the React DevTools/;
  page.on("console", (m) => { if (m.type() === "error" && !noise.test(m.text())) run.problems.push(`scene ${current?.n ?? "-"} console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => run.problems.push(`scene ${current?.n ?? "-"} pageerror: ${String(e).slice(0, 200)}`));
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(API)) run.problems.push(`scene ${current?.n ?? "-"} HTTP ${r.status()} ${new URL(r.url()).pathname}`); });
  try {
    await scene2();
    await scene3();
    await scene4();
    await scene5();
    await scene6();
    await scene7();
    await scene8(key);
  } finally {
    await setKill(key, false).catch((e) => run.problems.push(`re-enable failed: ${e.message}`));
    const health = await (await fetch(`${API}/health`)).json();
    run.disabledAfterRun = Object.entries(health.sources).filter(([, v]) => v.disabled).map(([name]) => name);
    run.finishedAt = new Date().toISOString();
    saveRun();
    await page.screencast.stop().catch(() => {});
    await browser.close();
  }
  console.log("problems:", run.problems.length ? run.problems : "none");
  console.log("error toasts:", run.toastErrors.length ? run.toastErrors : "none");
  console.log("disabled after run:", run.disabledAfterRun);
}

main().catch((e) => {
  console.error(String(e.stack ?? e).replace(/x-admin-key[^\s]*/gi, "x-admin-key"));
  process.exit(1);
});
