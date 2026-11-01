const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve('E:/Forge Hacakthon/screenshots');
const ARTIFACT_DIR = path.resolve('C:/Users/Siddharth Verma/.gemini/antigravity/brain/2054f2d2-07e9-4292-909c-b4840267c459/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function saveScreenshot(page, filename) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  const p2 = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

(async () => {
  const consoleMessages = [];
  const failedRequests = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure() ? req.failure().errorText : 'unknown' });
  });

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for MapLibre tiles and fields to settle

  // 01-home.png
  await saveScreenshot(page, '01-home.png');

  // 02-field-selected.png
  // Click the first field in the list (e.g. Ludhiana or Audit field)
  console.log("Selecting a field...");
  const fieldBtn = page.locator('ul button').first();
  await fieldBtn.click();
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '02-field-selected.png');

  // 03-trace-running.png
  console.log("Clicking Assess button...");
  const assessBtn = page.locator('button:has-text("Assess")');
  await assessBtn.click();
  await page.waitForTimeout(1500); // Capture while running
  await saveScreenshot(page, '03-trace-running.png');

  // 04-risk-card.png
  console.log("Waiting for assessment to complete...");
  await page.waitForSelector('text=finished:', { timeout: 60000 }).catch(() => {
    console.log("Trace wait timeout; continuing...");
  });
  await page.waitForTimeout(3000);
  // Scroll the right panel
  await page.evaluate(() => {
    const panels = document.querySelectorAll('.overflow-y-auto');
    panels.forEach(p => p.scrollTop = p.scrollHeight / 2);
  });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '04-risk-card.png');

  // 05-plan-hindi.png
  console.log("Switching language to Hindi...");
  const hindiBtn = page.locator('header button:has-text("हिन्दी")');
  await hindiBtn.click();
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const panels = document.querySelectorAll('.overflow-y-auto');
    panels.forEach(p => p.scrollTop = p.scrollHeight);
  });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '05-plan-hindi.png');

  // 06-time-machine.png
  console.log("Running Mar 2026 Time Machine preset...");
  const presetBtn = page.locator('button:has-text("Mar 2026")');
  await presetBtn.click();
  await page.waitForTimeout(1000);
  const replayAssessBtn = page.locator('button.bg-sky-600');
  await replayAssessBtn.click();
  console.log("Waiting for replay assessment...");
  await page.waitForTimeout(10000); // Allow replay to stream
  await page.evaluate(() => {
    const panels = document.querySelectorAll('.overflow-y-auto');
    panels.forEach(p => p.scrollTop = 0);
  });
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '06-time-machine.png');

  // 07-admin.png
  console.log("Opening admin panel...");
  const adminBtn = page.locator('header button:has-text("admin")');
  await adminBtn.click();
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '07-admin.png');

  await browser.close();

  console.log("\n=== BROWSER AUDIT LOGS ===");
  console.log("Console Messages:", consoleMessages.length);
  const errors = consoleMessages.filter(m => m.type === 'error');
  console.log("Console Errors:", errors.length, errors);
  console.log("Failed Network Requests:", failedRequests.length, failedRequests);
})();
