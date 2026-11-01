// Records card scenes 1, 9 and 10 to demo/clips/NN.webm. Needs demo/cards/architecture.png and,
// unless demo/phone.mp4 exists, demo/alert.json.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(require.resolve("playwright", { paths: [path.join(ROOT, "apps/web")] }));
const CLIPS = path.join(__dirname, "clips");
const CARDS = path.join(__dirname, "cards");
const SCENES = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, "scenes.json"), "utf8")).scenes.map((s) => [s.n, s]));
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const LIVE = "https://climateproblem.pages.dev/";
const REPO = "https://github.com/ZaroCoding/KhetiKavach";

const shell = (title, body) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f8f4ec;color:#20281c;font-family:"Segoe UI","Nirmala UI",Arial,sans-serif}
.third{position:fixed;left:32px;bottom:27px;padding:9px 19px;border-radius:8px;background:rgba(32,40,28,.88);color:#fff;font-weight:600;font-size:19px;border-left:5px solid #f59e0b}
.fade{animation:f .7s ease both}@keyframes f{from{opacity:0;transform:translateY(10px)}to{opacity:1}}</style>
<div class="fade">${body}</div><div class="third">${esc(title)}</div>`;

const title = () => `<div style="height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
<div style="font-size:128px;font-weight:800;color:#2f5d3a">KhetKavach</div>
<div style="font-size:50px;color:#6b5d48;margin-top:4px">खेतकवच</div>
<div style="font-size:42px;margin-top:40px;max-width:1400px">Field-level early warning for dry spells and damaging rain</div>
<div style="font-size:30px;font-weight:700;margin-top:48px;color:#b45309;letter-spacing:.14em">FORGE 2026</div></div>`;

function alertCard() {
  const a = JSON.parse(fs.readFileSync(path.join(__dirname, "alert.json"), "utf8"));
  const html = a.text.replace(/\n/g, "<br>"); // already Telegram HTML: the formatter escapes its values
  return `<div style="height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 170px">
<div style="font-size:30px;font-weight:700;color:#6b5d48;margin-bottom:26px">Telegram alert text for this field, in Hindi</div>
<div style="background:#fff;border:1px solid #dcd3c3;border-radius:18px;padding:38px 46px;font-size:29px;line-height:1.45;width:100%">${html}</div>
<div style="font-size:21px;color:#6b5d48;margin-top:26px;text-align:center">Produced by the app's alert formatter from assessment ${esc(a.assessment_id)}.<br>
Not a delivered message: alerts_sent holds ${esc(a.alerts_sent_rows)} rows.</div></div>`;
}

const closing = () => {
  const img = fs.readFileSync(path.join(CARDS, "architecture.png")).toString("base64");
  return `<div style="height:1080px;display:flex;flex-direction:column;align-items:center;padding:26px 60px 0">
<img src="data:image/png;base64,${img}" style="max-width:1800px;height:800px;object-fit:contain">
<div style="font-size:36px;font-weight:700;color:#2f5d3a;margin-top:18px">${LIVE}</div>
<div style="font-size:30px;margin-top:6px">${REPO}</div></div>`;
};

(async () => {
  fs.mkdirSync(CLIPS, { recursive: true });
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const cards = { 1: title, 10: closing };
  if (!fs.existsSync(path.join(__dirname, "phone.mp4"))) cards[9] = alertCard;
  for (const [n, make] of Object.entries(cards)) {
    const def = SCENES[n];
    const name = String(n).padStart(2, "0");
    await page.setContent("<body style='background:#f8f4ec'>");
    await page.screencast.start({ path: path.join(CLIPS, `${name}.webm`), size: { width: 1920, height: 1080 }, fps: 30 });
    await page.setContent(shell(def.title, make()));
    await page.waitForTimeout(def.seconds * 1000 + 300);
    await page.screencast.stop();
    fs.writeFileSync(path.join(CLIPS, `${name}.json`), JSON.stringify({ n: Number(n), target: def.seconds, duration: def.seconds + 0.3, waits: [] }));
    console.log("card", name);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
