// Normalises each clip to its scene length, then joins them: demo/scenes/NN.mp4 and
// demo/khetkavach-demo-silent.mp4 (1920x1080, 30 fps, H.264, no audio). Only agent-wait segments
// are sped up (max 3x, labelled); a long tail is cut and a short clip holds its last frame.
// Set FFBIN to the ffmpeg bin folder when ffmpeg is not on PATH.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const { chromium } = require(require.resolve("playwright", { paths: [path.join(ROOT, "apps/web")] }));
const FFMPEG = process.env.FFBIN ? path.join(process.env.FFBIN, "ffmpeg.exe") : "ffmpeg";
const CLIPS = path.join(__dirname, "clips");
const OUT = path.join(__dirname, "scenes");
const CARDS = path.join(__dirname, "cards");
const MAX = 3;
const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, "scenes.json"), "utf8")).scenes;
const ff = (args) => execFileSync(FFMPEG, ["-v", "error", "-y", ...args], { stdio: "inherit" });

async function labels(speeds) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 120, height: 60 } })).newPage();
  for (const s of speeds) {
    await page.setContent(`<body style="margin:0;background:transparent"><div style="display:inline-block;margin:6px;padding:6px 14px;border-radius:7px;background:rgba(32,40,28,.85);color:#fff;font:700 24px Segoe UI,Arial">${s}x</div>`);
    await page.screenshot({ path: path.join(CARDS, `speed-${s}.png`), omitBackground: true });
  }
  await browser.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(CARDS, { recursive: true });
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"];
  const plans = scenes.map((sc) => {
    const name = String(sc.n).padStart(2, "0");
    if (sc.n === 9 && fs.existsSync(path.join(__dirname, "phone.mp4"))) return { sc, name, phone: true, speed: 1, waits: [] };
    const meta = JSON.parse(fs.readFileSync(path.join(CLIPS, `${name}.json`), "utf8"));
    const waited = meta.waits.reduce((a, w) => a + w.end - w.start, 0);
    const room = sc.seconds - (meta.duration - waited);
    const speed = waited === 0 ? 1 : room <= 0 ? MAX : Math.min(MAX, Math.max(1, waited / room));
    return { sc, name, speed: Number(speed.toFixed(2)), waits: meta.waits };
  });
  await labels([...new Set(plans.filter((p) => p.speed > 1).map((p) => p.speed))]);
  for (const p of plans) {
    const out = path.join(OUT, `${p.name}.mp4`);
    const T = p.sc.seconds;
    if (p.phone) {
      ff(["-i", path.join(__dirname, "phone.mp4"), "-vf", `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=${T}`, "-t", String(T), ...enc, out]);
      continue;
    }
    const input = path.join(CLIPS, `${p.name}.webm`);
    if (p.speed === 1) {
      ff(["-i", input, "-vf", `tpad=stop_mode=clone:stop_duration=${T},fps=30`, "-t", String(T), ...enc, out]);
    } else {
      const parts = [];
      const shown = [];
      let cur = 0;
      let at = 0;
      for (const w of p.waits) {
        parts.push([cur, w.start, 1]);
        at += w.start - cur;
        shown.push([at, at + (w.end - w.start) / p.speed]);
        at += (w.end - w.start) / p.speed;
        parts.push([w.start, w.end, p.speed]);
        cur = w.end;
      }
      parts.push([cur, 9999, 1]);
      const seg = parts.map(([a, b, k], i) => `[0:v]trim=start=${a}:end=${b},setpts=(PTS-STARTPTS)/${k},fps=30[s${i}]`).join(";");
      const enable = shown.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join("+");
      const fc = `${seg};${parts.map((_, i) => `[s${i}]`).join("")}concat=n=${parts.length}:v=1:a=0[c];[c][1:v]overlay=W-w-24:18:enable='${enable}',tpad=stop_mode=clone:stop_duration=${T}[v]`;
      ff(["-i", input, "-i", path.join(CARDS, `speed-${p.speed}.png`), "-filter_complex", fc, "-map", "[v]", "-t", String(T), ...enc, out]);
    }
    console.log(`scene ${p.name}: ${T} s, wait speed ${p.speed}x`);
  }
  const list = path.join(OUT, "list.txt");
  fs.writeFileSync(list, plans.map((p) => `file '${p.name}.mp4'`).join("\n"));
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-an", "-movflags", "+faststart", path.join(__dirname, "khetkavach-demo-silent.mp4")]);
  fs.unlinkSync(list);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
