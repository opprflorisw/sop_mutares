import { fmtMoney, fmtUnits, type ProjectData } from "./projectData";
import type { Project } from "./projects";

// ============================================================
// Self-contained S&OP report generator. Produces ONE branded HTML
// document (inline CSS + data, no external deps) that is both an
// interactive web page and a clean print/PDF — with logo, header,
// footer, confidential banner, watermark and selectable widgets.
// ============================================================

export type WidgetKey =
  | "kpis" | "trend" | "gap" | "inventory" | "capacity" | "issues" | "decisions" | "accuracy" | "customers";

export const WIDGETS: { key: WidgetKey; label: string }[] = [
  { key: "kpis", label: "Executive KPIs" },
  { key: "trend", label: "Revenue trend" },
  { key: "gap", label: "Demand vs Supply gap" },
  { key: "inventory", label: "Inventory by plant" },
  { key: "capacity", label: "Capacity & overload" },
  { key: "issues", label: "Open issues" },
  { key: "decisions", label: "Decisions & actions" },
  { key: "accuracy", label: "Forecast accuracy (SKU)" },
  { key: "customers", label: "Customer demand mix" },
];

export type ReportDecision = { title: string; owner: string; status: string; due: string };

export type ReportConfig = {
  companyName: string;
  logoDataUrl: string | null;
  confidential: boolean;
  watermark: string;
  footer: string;
  pageNumbers: boolean;
  widgets: Record<WidgetKey, boolean>;
};

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tone(status: "good" | "warn" | "bad" | string) {
  return status === "good" ? "#1d9e75" : status === "warn" ? "#ef9f27" : "#e24b4a";
}

export function buildReportHtml(
  project: Project,
  d: ProjectData,
  cfg: ReportConfig,
  generatedDate: string,
  decisions: ReportDecision[] = []
): string {
  const c = d.currency;
  const W = cfg.widgets;
  const sections: string[] = [];

  if (W.kpis) {
    const k = d.kpis;
    const tiles = [
      ["Revenue projection (12m)", fmtMoney(k.revenueProjection, c)],
      ["Forecast accuracy", `${k.forecastAccuracy}%`],
      ["Forecast bias", `${k.forecastBias >= 0 ? "+" : ""}${k.forecastBias}%`],
      ["Inventory days", `${k.inventoryDays} d`],
      ["Capacity utilisation", `${k.capacityUtil}%`],
      ["Revenue at risk", fmtMoney(k.revenueAtRisk, c)],
    ];
    sections.push(section("Executive KPIs", `<div class="kpis">${tiles
      .map(([l, v]) => `<div class="kpi"><div class="kl">${esc(l)}</div><div class="kv">${esc(v)}</div></div>`)
      .join("")}</div>`));
  }

  if (W.trend && d.demandSeries.length) {
    const s = d.demandSeries;
    const max = Math.max(1, ...s.map((p) => p.rev));
    const bw = Math.max(4, Math.floor(760 / s.length) - 2);
    const bars = s.map((p, i) => {
      const h = Math.round((p.rev / max) * 80);
      const x = i * (bw + 2);
      return `<rect x="${x}" y="${90 - h}" width="${bw}" height="${h}" rx="2" fill="${p.actual ? "#85b7eb" : "#185fa5"}"></rect>`;
    }).join("");
    const labels = s.map((p, i) => (i % 3 === 0 ? `<text x="${i * (bw + 2)}" y="100" font-size="8" fill="#8a929e">${esc(p.m.slice(2))}</text>` : "")).join("");
    sections.push(section("Revenue trend — actuals + forecast", `
      <svg viewBox="0 0 ${s.length * (bw + 2)} 104" width="100%" height="120" preserveAspectRatio="none">${bars}${labels}</svg>
      <div class="muted" style="margin-top:4px">Light bars = actuals, dark = forecast. Values in ${esc(c)}.</div>`));
  }

  if (W.gap) {
    const maxD = Math.max(1, ...d.families.map((f) => f.unconstrained));
    const rows = d.families.map((f) => {
      const dW = (f.unconstrained / maxD) * 100;
      const sW = (f.constrained / maxD) * 100;
      return `<tr>
        <td>${esc(f.family)}</td>
        <td class="r">${fmtUnits(f.unconstrained)}</td>
        <td class="r">${fmtUnits(f.constrained)}</td>
        <td class="r" style="color:${f.gapUnits > 0 ? "#a32d2d" : "#3b6d11"}">${f.gapUnits > 0 ? "-" + fmtUnits(f.gapUnits) : "0"}</td>
        <td class="r">${f.gapPct.toFixed(0)}%</td>
        <td class="r">${f.revenueAtRisk > 0 ? fmtMoney(f.revenueAtRisk, c) : "—"}</td>
        <td style="width:160px"><div class="bar"><span class="bd" style="width:${dW}%"></span><span class="bs" style="width:${sW}%;background:${f.gapUnits > 0 ? "#185fa5" : "#1d9e75"}"></span></div></td>
      </tr>`;
    }).join("");
    sections.push(section("Demand vs Supply gap — by family", `<table>
      <thead><tr><th>Family</th><th class="r">Demand</th><th class="r">Supply</th><th class="r">Gap</th><th class="r">Gap %</th><th class="r">At risk</th><th>Demand / supply</th></tr></thead>
      <tbody>${rows}</tbody></table>`));
  }

  if (W.inventory && d.plants.length) {
    const rows = d.plants.map((p) => `<tr>
      <td>${esc(p.name)}</td>
      <td class="r">${fmtMoney(p.invTotal, c)}</td>
      <td class="r">${fmtMoney(p.rm, c)}</td>
      <td class="r">${fmtMoney(p.wip, c)}</td>
      <td class="r">${fmtMoney(p.fg, c)}</td>
      <td class="r" style="color:${p.invDays > 40 ? "#a32d2d" : "#3b6d11"}">${p.invDays.toFixed(1)}</td>
    </tr>`).join("");
    sections.push(section("Inventory by plant", `<table>
      <thead><tr><th>Plant</th><th class="r">Total</th><th class="r">RM</th><th class="r">WIP</th><th class="r">FG</th><th class="r">Days</th></tr></thead>
      <tbody>${rows}</tbody></table>`));
  }

  if (W.capacity && d.capacityLines.length) {
    const rows = d.capacityLines.map((l) => `<tr>
      <td>${esc(l.plant)} · ${esc(l.line)}</td>
      <td style="width:220px"><div class="bar"><span class="bs" style="width:${Math.min(100, l.util)}%;background:${l.overload ? "#e24b4a" : "#185fa5"}"></span></div></td>
      <td class="r" style="color:${l.overload ? "#a32d2d" : "#1a1d21"}">${l.util.toFixed(0)}%</td>
      <td>${l.overload ? '<span class="tag bad">Overload</span>' : '<span class="tag ok">OK</span>'}</td>
    </tr>`).join("");
    sections.push(section("Capacity utilisation", `<table><tbody>${rows}</tbody></table>`));
  }

  if (W.issues) {
    const rows = d.issues.length
      ? d.issues.map((i) => `<tr><td><span class="tag ${i.severity === "critical" ? "bad" : i.severity === "high" ? "warn" : "info"}">${i.severity}</span></td><td><b>${esc(i.title)}</b><div class="muted">${esc(i.detail)}</div></td><td class="r">${i.valueAtRisk > 0 ? fmtMoney(i.valueAtRisk * 1000, c) : "—"}</td></tr>`).join("")
      : `<tr><td colspan="3" class="muted">No open issues — plan is balanced.</td></tr>`;
    sections.push(section("Open issues", `<table><tbody>${rows}</tbody></table>`));
  }

  if (W.decisions) {
    const tg: Record<string, string> = { open: "warn", in_progress: "info", done: "ok" };
    const rows = decisions.length
      ? decisions.map((x) => `<tr><td><span class="tag ${tg[x.status] || "info"}">${esc(x.status.replace("_", " "))}</span></td><td><b>${esc(x.title)}</b></td><td>${esc(x.owner)}</td><td>${esc(x.due)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">No decisions logged.</td></tr>`;
    sections.push(section("Decisions & actions", `<table>
      <thead><tr><th>Status</th><th>Decision / action</th><th>Owner</th><th>Due</th></tr></thead>
      <tbody>${rows}</tbody></table>`));
  }

  if (W.accuracy && d.skuAccuracy.length) {
    const rows = d.skuAccuracy.slice(0, 12).map((s) => `<tr>
      <td>${esc(s.sku)}</td><td>${esc(s.desc)}</td>
      <td class="r" style="color:${tone(s.status)}">${s.mape}%</td>
      <td class="r">${s.bias >= 0 ? "+" : ""}${s.bias}%</td>
      <td><span class="tag ${s.status === "good" ? "ok" : s.status === "warn" ? "warn" : "bad"}">${esc(s.state)}</span></td>
    </tr>`).join("");
    sections.push(section("Forecast accuracy & bias — SKU level (vs prior year)", `<table>
      <thead><tr><th>SKU</th><th>Description</th><th class="r">MAPE</th><th class="r">BIAS</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>`));
  }

  if (W.customers && d.customerMix.length) {
    const rows = d.customerMix.map((m) => `<tr>
      <td><span class="dot" style="background:${m.color}"></span>${esc(m.name)}</td>
      <td style="width:240px"><div class="bar"><span class="bs" style="width:${(m.share * 100).toFixed(0)}%;background:${m.color}"></span></div></td>
      <td class="r">${(m.share * 100).toFixed(1)}%</td>
    </tr>`).join("");
    sections.push(section("Customer demand mix", `<table><tbody>${rows}</tbody></table>`));
  }

  const logo = cfg.logoDataUrl
    ? `<img class="logo" src="${cfg.logoDataUrl}" alt="logo"/>`
    : `<div class="logo-txt">${esc(cfg.companyName || project.name)}</div>`;

  const watermark = cfg.watermark
    ? `<div class="watermark">${esc(cfg.watermark)}</div>`
    : "";

  const footerText = [
    cfg.companyName || project.name,
    cfg.confidential ? "CONFIDENTIAL" : "",
    `Generated ${generatedDate}`,
    cfg.footer,
  ].filter(Boolean).join("  ·  ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>S&OP Review — ${esc(project.name)}</title>
<style>
  :root{--navy:#0f3460;--blue:#185fa5;--line:#e7eaee;--ink:#1a1d21;--ink2:#5b6470;--ink3:#8a929e}
  *{box-sizing:border-box}
  body{margin:0;font-family:ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:#f4f6f8;font-size:13px}
  .toolbar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;background:#fff;border-bottom:1px solid var(--line);padding:10px 16px}
  .toolbar button{font:inherit;font-size:12px;padding:6px 12px;border-radius:7px;border:1px solid var(--line);background:#fff;cursor:pointer}
  .toolbar .primary{background:var(--blue);color:#fff;border-color:var(--blue)}
  .toolbar .sp{flex:1}
  .page{max-width:900px;margin:18px auto;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .cover{background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;padding:26px 28px;position:relative}
  .cover .logo{height:26px;filter:brightness(0) invert(1)}
  .cover .logo-txt{font-size:18px;font-weight:700}
  .cover h1{margin:14px 0 4px;font-size:23px}
  .cover .sub{opacity:.8;font-size:13px}
  .badge{position:absolute;top:18px;right:22px;background:#e24b4a;color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em;padding:4px 9px;border-radius:5px}
  .body{padding:20px 28px 28px}
  section.w{margin-top:18px;page-break-inside:avoid}
  section.w h2{font-size:14px;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;color:var(--ink2);font-weight:600;font-size:11px;padding:5px 8px;border-bottom:1px solid var(--line)}
  td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  .muted{color:var(--ink3);font-size:11px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .kpi{border:1px solid var(--line);border-radius:8px;padding:10px 12px}
  .kpi .kl{font-size:11px;color:var(--ink2)}
  .kpi .kv{font-size:19px;font-weight:600;margin-top:3px}
  .bar{position:relative;display:flex;flex-direction:column;gap:2px}
  .bar .bd{display:block;height:6px;border-radius:3px;background:#cfe0f3}
  .bar .bs{display:block;height:6px;border-radius:3px;background:var(--blue)}
  .tag{font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px}
  .tag.ok{background:#eaf3de;color:#3b6d11}.tag.warn{background:#faeeda;color:#854f0b}.tag.bad{background:#fcebeb;color:#a32d2d}.tag.info{background:#e6f1fb;color:#185fa5}
  .dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;vertical-align:middle}
  .pagefoot{display:none}
  .watermark{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px;font-weight:800;color:rgba(15,52,96,.06);transform:rotate(-30deg);pointer-events:none;z-index:0}
  @media print{
    body{background:#fff;font-size:11.5px}
    .toolbar{display:none}
    .page{max-width:none;margin:0;border:0;border-radius:0}
    .cover{border-radius:0}
    .pagefoot{display:block;position:fixed;bottom:0;left:0;right:0;font-size:9px;color:var(--ink3);text-align:center;padding:6px 0;border-top:1px solid var(--line);background:#fff}
    @page{margin:14mm 12mm 16mm}
  }
</style></head>
<body>
  <div class="toolbar">
    <strong style="font-size:13px">S&OP Review — ${esc(project.name)}</strong>
    <span class="sp"></span>
    <button onclick="toggleAll()">Collapse all</button>
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${watermark}
  <div class="page">
    <div class="cover">
      ${cfg.confidential ? '<div class="badge">CONFIDENTIAL</div>' : ""}
      ${logo}
      <h1>S&OP Review${cfg.companyName ? " — " + esc(cfg.companyName) : ""}</h1>
      <div class="sub">${esc(project.industry)} · ${esc(project.factory)} · ${esc(generatedDate)}</div>
    </div>
    <div class="body">${sections.join("")}</div>
  </div>
  <div class="pagefoot">${esc(footerText)}</div>
  <script>
    function toggleAll(){document.querySelectorAll('section.w').forEach(function(s){var b=s.querySelector('.wb');if(b)b.style.display=b.style.display==='none'?'':'none';});}
    document.querySelectorAll('section.w h2').forEach(function(h){h.style.cursor='pointer';h.onclick=function(){var b=h.nextElementSibling;if(b)b.style.display=b.style.display==='none'?'':'none';};});
  </script>
</body></html>`;
}

function section(title: string, inner: string): string {
  return `<section class="w"><h2>${esc(title)}</h2><div class="wb">${inner}</div></section>`;
}
