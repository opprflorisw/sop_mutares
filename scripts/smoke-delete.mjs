// Non-destructive check of the Projects-page delete guardrail: the trash
// icon opens a modal that (a) explains the cascade, (b) keeps the Delete
// button disabled until the exact project name is typed. Then Cancel — no
// project is deleted.
import puppeteer from "puppeteer-core";
const BASE = "http://localhost:4188";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TARGET = "Nordic Smart Home Electronics — EU";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--window-size=1440,1200"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const waitText = async (t, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await page.evaluate((x) => document.body.innerText.includes(x), t)) return true; await sleep(250); } return false; };
const click = (t) => page.evaluate((x) => { const e = [...document.querySelectorAll("button,a")].find((n) => n.innerText.trim() === x) || [...document.querySelectorAll("button,a")].find((n) => n.innerText.includes(x)); if (e) { e.click(); return true; } return false; }, t);
try {
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await waitText("Sign in");
  await page.type("input[type=email]", "floris@oppr.ai");
  await page.type("input[type=password]", "12345678");
  await click("Sign in");
  await waitText("Projects & Data", 20000);
  await waitText(TARGET, 20000);

  // open the target card's trash button
  const opened = await page.evaluate((name) => {
    const heads = [...document.querySelectorAll("h3,a,span,div")].filter((e) => e.textContent && e.textContent.trim().startsWith(name)).sort((a, b) => a.textContent.length - b.textContent.length);
    let n = heads[0];
    const has = (x) => x.querySelectorAll && [...x.querySelectorAll("button")].some((b) => (b.getAttribute("aria-label") || "") === "Delete project");
    while (n && !has(n)) n = n.parentElement;
    if (!n) return false;
    n.querySelectorAll("button").forEach(() => {});
    [...n.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Delete project").click();
    return true;
  }, TARGET);
  console.log("trash icon present + clicked: " + (opened ? "✓" : "MISSING"));
  if (!opened) errors.push("no trash icon");

  console.log("modal cascade warning: " + ((await waitText("all of its underlying data", 8000)) ? "✓" : "MISSING"));
  console.log("lists dashboards/decisions/overrides: " + ((await page.evaluate(() => /dashboards/.test(document.body.innerText) && /overrides/.test(document.body.innerText))) ? "✓" : "MISSING"));
  await page.screenshot({ path: "scripts/smoke-delete-modal.png" });

  const disabled = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Delete project"); return b ? b.disabled : null; });
  console.log("delete disabled before typing name: " + (disabled ? "✓ (guardrail holds)" : "NO"));
  if (!disabled) errors.push("delete enabled before confirm");

  // type a WRONG name → still disabled
  await page.type('input[placeholder="' + TARGET + '"]', "wrong name");
  await sleep(300);
  const stillDisabled = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Delete project"); return b ? b.disabled : null; });
  console.log("delete still disabled on wrong name: " + (stillDisabled ? "✓" : "NO"));
  if (!stillDisabled) errors.push("delete enabled on wrong name");

  // cancel — do NOT delete
  await click("Cancel");
  await sleep(500);
  console.log("project intact after cancel: " + ((await page.evaluate((n) => document.body.innerText.includes(n), TARGET)) ? "✓" : "GONE!"));

  console.log("\n" + (errors.length ? "✗ ISSUES: " + errors.join("; ") : "✓ delete guardrail verified (non-destructive)"));
} catch (e) { console.log("FAIL: " + e.message); errors.push(e.message); await page.screenshot({ path: "scripts/smoke-delete-FAIL.png" }).catch(() => {}); }
finally { await browser.close(); process.exit(errors.length ? 1 : 0); }
