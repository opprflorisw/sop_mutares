// Puppeteer smoke for the Nordic Smart Home Electronics demo:
// logs in, opens the seeded project, walks every page + dashboard tab,
// and reports console/page errors + which widgets rendered.
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:4188";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const IGNORE = [/ResizeObserver/, /favicon/, /Download the React DevTools/, /\[vite\]/];

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--window-size=1440,1900"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1900 });
page.on("console", (m) => { if (m.type() === "error" && !IGNORE.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`); });
page.on("pageerror", (e) => { if (!IGNORE.some((re) => re.test(String(e)))) errors.push(`pageerror: ${e.message}`); });

async function waitForText(txt, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const found = await page.evaluate((t) => document.body.innerText.includes(t), txt);
    if (found) return true;
    await sleep(300);
  }
  return false;
}
async function clickText(txt) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll("button, a, [role=button]")];
    const el = els.find((e) => e.innerText.trim() === t) || els.find((e) => e.innerText.includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, txt);
}

try {
  // 1. login
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await waitForText("Sign in");
  await page.type('input[type=email]', "floris@oppr.ai");
  await page.type('input[type=password]', "12345678");
  await clickText("Sign in");
  await waitForText("Projects & Data", 20000);
  console.log("✓ logged in");

  // 2. wait for the demo project to seed + appear, open its S&OP tool
  const seeded = await waitForText("Nordic Smart Home Electronics", 25000);
  if (!seeded) throw new Error("demo project never appeared (seed failed?)");
  console.log("✓ demo project seeded");
  // open the Nordic card's own "S&OP tool" button: find the most specific
  // element with the name, then walk UP to the card that owns the button.
  const opened = await page.evaluate(() => {
    const heads = [...document.querySelectorAll("h1,h2,h3,h4,a,span,div")]
      .filter((e) => e.textContent && e.textContent.trim().startsWith("Nordic Smart Home Electronics"))
      .sort((a, b) => a.textContent.length - b.textContent.length);
    let node = heads[0];
    const hasBtn = (n) => n.querySelectorAll && [...n.querySelectorAll("button")].some((b) => b.innerText.includes("S&OP tool"));
    while (node && !hasBtn(node)) node = node.parentElement;
    if (!node) return false;
    const btn = [...node.querySelectorAll("button")].find((b) => b.innerText.includes("S&OP tool"));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!opened) throw new Error("couldn't find the Nordic card's S&OP tool button");
  // confirm we're in the RIGHT project (breadcrumb / sidebar shows the name)
  const right = await waitForText("Nordic Smart Home Electronics", 20000);
  if (!right) throw new Error("opened the wrong project");
  await sleep(1800);

  // navigate by clicking the real left-nav anchor for a /tool/<page> route
  async function navTo(href) {
    return page.evaluate((h) => {
      const a = [...document.querySelectorAll(`a[href='${h}']`)][0];
      if (a) { a.click(); return true; }
      return false;
    }, href);
  }

  // 3. walk pages + dashboard tabs; assert each tab's marker content renders
  const pages = [
    { href: "/tool/overview", key: "overview", tabs: [["Executive scorecard", "OTIF"], ["Exec S&OP summary", "Saturday shift"], ["S&OP process", "Monthly Cycle"]] },
    { href: "/tool/demand", key: "demand", tabs: [["Forecast & accuracy", "Lag trend"]] },
    { href: "/tool/capacity", key: "capacity", tabs: [["Capacity balance", "Unconstrained"]] },
    { href: "/tool/supply", key: "supply", tabs: [["Supply & inventory", "Gap"]] },
  ];
  for (const p of pages) {
    await navTo(p.href);
    await sleep(1000);
    await waitForText(p.tabs[0][0], 12000);
    for (const [tab, marker] of p.tabs) {
      await clickText(tab);
      const ok = await waitForText(marker, 8000);
      console.log(`  ${p.key} · ${tab}: marker "${marker}" ${ok ? "✓" : "MISSING"}`);
      if (!ok) errors.push(`${p.key}/${tab}: marker "${marker}" not found`);
      await page.screenshot({ path: `scripts/smoke-${p.key}-${tab.replace(/[^a-z0-9]+/gi, "_")}.png` });
    }
  }

  console.log(`\n${errors.length === 0 ? "✓ NO console/page errors + all markers present" : "✗ ISSUES:"}`);
  errors.slice(0, 20).forEach((e) => console.log("   " + e));
} catch (e) {
  console.log("SMOKE FAILED: " + e.message);
  errors.push("fatal: " + e.message);
  await page.screenshot({ path: "scripts/smoke-FAIL.png" }).catch(() => {});
} finally {
  await browser.close();
  process.exit(errors.length ? 1 : 0);
}
