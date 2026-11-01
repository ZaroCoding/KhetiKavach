// Writes demo/values.md from this run's real API responses (demo/clips/run.json lists the ids).
const fs = require("node:fs");
const path = require("node:path");

const run = JSON.parse(fs.readFileSync(path.join(__dirname, "clips/run.json"), "utf8"));
const API = run.api;
const alertFile = path.join(__dirname, "alert.json");
const alert = fs.existsSync(alertFile) ? JSON.parse(fs.readFileSync(alertFile, "utf8")) : null;
const pct = (v) => (v === null || v === undefined ? "unavailable" : `${Math.round(v * 1000) / 10}%`);

async function events(id) {
  const text = await (await fetch(`${API}/api/assessments/${id}/stream`)).text();
  return text.split("\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5)));
}

async function section(label, id) {
  const a = await (await fetch(`${API}/api/assessments/${id}`)).json();
  const ev = await events(id);
  const out = [
    `## ${label}`,
    "",
    `- assessment id: \`${id}\``,
    `- status: ${a.status}; mode: ${a.mode}; as_of: ${a.as_of ?? "today"}; replay basis: ${a.replay_basis ?? "n/a"}; plan generator: ${a.plan_generator}; language: ${a.language}`,
    "",
    "| Hazard | Method | Severity | Probability / outcome | 90% range | Usual chance | ECMWF members | GEFS members | Stage | Window |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of a.risks) {
    const yesNo = r.method === "deterministic_replay";
    const ci = r.probability_ci90 ? `${pct(r.probability_ci90[0])}–${pct(r.probability_ci90[1])}` : "n/a";
    const m = (x) => (x ? `${x.exceeding}/${x.total}` : "n/a");
    out.push(`| ${r.hazard} | ${r.method} | ${r.severity} | ${yesNo ? (r.probability ? "YES" : "NO") : pct(r.probability)} | ${ci} | ${pct(r.climatology_probability)} | ${m(r.members?.ecmwf)} | ${m(r.members?.gfs)} | ${r.crop_stage} | ${r.window ? `${r.window.start} to ${r.window.end}` : "n/a"} |`);
  }
  const notable = ev.filter((e) => ["gate_failed", "fallback_used", "verifier_rejected"].includes(e.event));
  out.push("", `Gate and fallback events: ${notable.length ? "" : "none"}`);
  for (const e of notable) {
    const d = e.data.detail ?? {};
    out.push(e.event === "fallback_used" ? `- fallback_used: ${d.from_source} (${d.from_tool ?? ""}) → ${d.to_source} (${d.to_tool ?? ""}): ${d.message ?? d.reason}` : `- ${e.event}: ${e.data.tool ?? e.node} [${d.check ?? ""}] ${d.reason ?? JSON.stringify(d)}`);
  }
  if (a.plan[0]) {
    const c = a.plan[0].citation;
    out.push("", `Plan action 1: "${a.plan[0].text}" (by ${a.plan[0].when})`, `Citation: ${c.doc_title} (${c.plan_year}), p.${c.page}`);
  }
  out.push("");
  return out.join("\n");
}

(async () => {
  const f = run.liveField;
  const parts = [
    "# Real values from this recording",
    "",
    `Recorded ${run.startedAt} against the local stack (web ${run.base}, API ${API}).`,
    "",
    `- Demo field: **${f.name}**, code **${f.short_code}**, ${f.crop}, sown ${f.sowing_date}, ${f.district_code}`,
    `- Kill-switch field: ${run.killField.name}, code ${run.killField.short_code}`,
    `- Registration rejection shown: ${run.rejectionReason}`,
    `- Sources disabled after the run: ${run.disabledAfterRun.length ? run.disabledAfterRun.join(", ") : "none"}`,
    "",
  ];
  parts.push(await section("Scenes 4-5: live run", run.assessments.live_en));
  parts.push(await section("Scene 6: live run in Hindi", run.assessments.live_hi));
  parts.push(await section("Scene 7: Time Machine, March 2026", run.assessments.replay_mar_2026));
  parts.push(await section("Scene 7: Time Machine, August 2023", run.assessments.replay_aug_2023));
  parts.push(await section("Scene 8: open_meteo_ensemble switched off", run.assessments.kill_switch));
  if (alert) parts.push("## Scene 9: alert card", "", `alerts_sent rows: ${alert.alerts_sent_rows}. The card shows formatter output, not a delivered message.`, "", "```", alert.text, "```", "");
  fs.writeFileSync(path.join(__dirname, "values.md"), parts.join("\n"));
  console.log("values.md written");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
