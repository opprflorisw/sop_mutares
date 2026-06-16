import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconSparkles, IconSend, IconPlus, IconDownload, IconX, IconCopy, IconFile,
  IconChart, IconBolt, IconBox, IconUsers,
} from "./icons";
import ChatMarkdown from "./ChatMarkdown";
import { aiChat, type AiSource } from "../lib/ai";
import { useProjectData, fmtMoney, fmtUnits, type ProjectData } from "../lib/projectData";
import { useProjects, type Project } from "../lib/projects";
import { profileProject } from "../lib/dataProfile";
import { tierCatalog, resolveIndustryKey } from "../lib/widgetCatalog";
import { useAiModel, useChatProfiles, modelLabel, type ChatProfile } from "../lib/settingsStore";

// ============================================================
// Persistent AI assistant — a drawer toggled from a floating button,
// available across every module. Grounds Gemini on the live project
// data; streams the reply in; renders markdown with in-app links;
// supports chat personas, a fresh chat and export.
// ============================================================

type Msg = { role: "user" | "assistant"; text: string };

const PROFILE_ICON: Record<string, typeof IconChart> = {
  chart: IconChart, sparkles: IconSparkles, file: IconFile, bolt: IconBolt, box: IconBox, users: IconUsers,
};

// A compact "what data exists" inventory so the assistant can chat about
// the dataset itself (coverage, gaps) and which widgets it does/doesn't
// support — not just the derived numbers.
function dataInventory(project: Project): string {
  const profile = profileProject(project);
  const industry = resolveIndustryKey(project.industry);
  const { ready, locked } = tierCatalog(profile, industry);
  const up = profile.templates.filter((t) => t.uploaded)
    .map((t) => `${t.title} (${t.rows} rows${t.dateCoverage ? `, ${t.dateCoverage.start}..${t.dateCoverage.end}${t.dateCoverage.gaps ? `, ${t.dateCoverage.gaps} gap(s)` : ""}` : ""}, ${t.quality})`)
    .join("; ");
  const missing = profile.templates.filter((t) => !t.uploaded).map((t) => t.title).join(", ") || "none";
  const lockedNote = locked.slice(0, 5).map((l) => `${l.entry.title} (needs ${l.missing.map((m) => m.templateId).join("/")})`).join("; ") || "none";
  return [
    `Data inventory — uploaded: ${up || "none"}.`,
    `Not uploaded: ${missing}.`,
    `Dashboard widgets: ${ready.length} data-ready, ${locked.length} locked. Locked examples: ${lockedNote}.`,
  ].join("\n");
}

function buildContext(project: Project | null, d: ProjectData): string {
  if (!project || !d.hasData) return "No project data loaded yet.";
  const fam = d.families.slice(0, 6).map((f) =>
    `${f.family}: demand ${fmtUnits(f.unconstrained)} / supply ${fmtUnits(f.constrained)} (gap ${f.gapPct.toFixed(0)}%, ${fmtMoney(f.revenueAtRisk, d.currency)} at risk)`
  ).join("; ");
  const over = d.capacityLines.filter((l) => l.overload).map((l) => `${l.plant} ${l.line} ${l.util.toFixed(0)}%`).join(", ") || "none";
  const issues = d.issues.map((i) => i.title).join("; ") || "none";
  const mats = d.materialAlerts.slice(0, 4).map((a) => `${a.material} (${a.reliability}% OTIF, ${a.leadTime}d, affects ${a.affects})`).join("; ") || "none";
  const slob = d.slob.slice(0, 4).map((s) => `${s.sku} ${fmtMoney(s.value, d.currency)} (${s.status})`).join("; ") || "none";
  return [
    `Project: ${project.name} (${d.currency}).`,
    `KPIs — 12m revenue ${fmtMoney(d.kpis.revenueProjection, d.currency)}; contribution margin ${fmtMoney(d.kpis.contributionMargin, d.currency)} (${d.kpis.cmPct}%); forecast accuracy ${d.kpis.forecastAccuracy}% (bias ${d.kpis.forecastBias}%); inventory ${d.kpis.inventoryDays}d vs ${d.kpis.inventoryTarget}d target (${d.kpis.inventoryTurns}× turns); capacity ${d.kpis.capacityUtil}% of MAC; revenue at risk ${fmtMoney(d.kpis.revenueAtRisk, d.currency)}.`,
    `Family demand vs supply — ${fam}.`,
    `Overloaded lines: ${over}.`,
    `Material / supplier risk: ${mats}.`,
    `Slow / obsolete stock: ${slob}.`,
    `Open issues: ${issues}.`,
    dataInventory(project),
  ].join("\n");
}

export default function AssistantDrawer() {
  const { activeProject } = useProjects();
  const d = useProjectData();
  const navigate = useNavigate();
  const [model] = useAiModel();
  const [profiles] = useChatProfiles();

  const context = buildContext(activeProject, d);
  const greeting = (): Msg => ({
    role: "assistant",
    text: activeProject && d.hasData
      ? `Loaded **${activeProject.name}** — ${d.families.length} families, ${fmtMoney(d.kpis.revenueProjection, d.currency)} 12-month plan with ${fmtMoney(d.kpis.revenueAtRisk, d.currency)} at risk. Ask me anything, or pick a persona above. Try **"biggest gap"**, **"capacity"** or **"forecast bias"**.`
      : "Load a project's data and I'll plan over it. Ask about the gap, capacity, forecast or inventory.",
  });

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([greeting()]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<AiSource | null>(null);
  const [activeProfileId, setActiveProfileId] = useState(profiles[0]?.id ?? "analyst");
  const [exportOpen, setExportOpen] = useState(false);
  // streaming reveal
  const [typing, setTyping] = useState<{ text: string } | null>(null);
  const [shown, setShown] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const activeProfile: ChatProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const scroll = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);

  // reveal effect — flows the assistant reply in character-by-character
  useEffect(() => {
    if (!typing) return;
    if (shown >= typing.text.length) {
      setMessages((m) => [...m, { role: "assistant", text: typing.text }]);
      setTyping(null);
      setShown(0);
      return;
    }
    const id = setTimeout(() => setShown((s) => Math.min(typing.text.length, s + 4)), 10);
    return () => clearTimeout(id);
  }, [typing, shown]);

  useEffect(() => { if (open) scroll(); }, [messages, typing, shown, busy, open]);

  // close the export menu on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  async function send() {
    const q = input.trim();
    if (!q || busy || typing) return;
    const next: Msg[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    scroll();
    const { text, source } = await aiChat(next, context, { model, profilePrompt: activeProfile?.prompt });
    setSource(source);
    setBusy(false);
    setTyping({ text });
    setShown(0);
  }

  function newChat() {
    setMessages([greeting()]);
    setTyping(null);
    setShown(0);
    setInput("");
    setSource(null);
  }

  function onLink(href: string) {
    setOpen(false);
    navigate(href);
  }

  const transcript = () =>
    `# S&OP Assistant — ${activeProject?.name ?? "chat"}\n\n` +
    messages.map((m) => `**${m.role === "user" ? "You" : "Assistant"}:** ${m.text}`).join("\n\n");

  async function copyChat() {
    try { await navigator.clipboard.writeText(transcript()); } catch { /* ignore */ }
    setExportOpen(false);
  }
  function downloadChat() {
    const blob = new Blob([transcript()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sop-chat-${(activeProject?.name ?? "project").replace(/\W+/g, "-").toLowerCase()}.md`;
    a.click(); URL.revokeObjectURL(url);
    setExportOpen(false);
  }
  function printChat() {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const rows = messages.map((m) =>
      `<div class="msg ${m.role}"><div class="who">${m.role === "user" ? "You" : "Assistant"}</div><div class="body">${esc(m.text).replace(/\n/g, "<br>")}</div></div>`
    ).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>S&OP Assistant — ${esc(activeProject?.name ?? "chat")}</title>
      <style>body{font:13px/1.55 system-ui,Segoe UI,Arial;color:#1a1d21;max-width:680px;margin:32px auto;padding:0 16px}
      h1{font-size:18px}.msg{margin:14px 0}.who{font-size:11px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:.04em}
      .body{margin-top:3px}.user .body{color:#0f3460}</style></head>
      <body><h1>S&amp;OP Assistant — ${esc(activeProject?.name ?? "chat")}</h1>${rows}
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
    setExportOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[var(--color-brand-700)] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg transition-colors hover:bg-[var(--color-brand-800)]"
        >
          <IconSparkles size={17} /> Ask AI
        </button>
      )}

      {open && (
        <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[420px] flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
          {/* header */}
          <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3.5 py-2.5">
            <IconSparkles size={17} className="text-[var(--color-brand-700)]" />
            <span className="text-[13px] font-semibold">S&OP Assistant</span>
            {activeProject && (
              <span className="max-w-[130px] truncate rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-brand-700)] ring-1 ring-inset ring-[var(--color-brand-100)]" title={`Working on ${activeProject.name}`}>
                {activeProject.name}
              </span>
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={newChat} title="New chat" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]">
                <IconPlus size={16} />
              </button>
              <div ref={exportRef} className="relative">
                <button onClick={() => setExportOpen((o) => !o)} title="Export chat" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]">
                  <IconDownload size={16} />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-xl">
                    <ExportItem icon={<IconCopy size={14} />} label="Copy to clipboard" onClick={copyChat} />
                    <ExportItem icon={<IconDownload size={14} />} label="Download (.md)" onClick={downloadChat} />
                    <ExportItem icon={<IconFile size={14} />} label="Print / Save as PDF" onClick={printChat} />
                  </div>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]" aria-label="Close assistant">
                <IconX size={16} />
              </button>
            </div>
          </div>

          {/* persona switcher */}
          <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-2">
            <div className="flex items-center gap-1">
              {profiles.map((p) => {
                const Icon = PROFILE_ICON[p.icon] ?? IconSparkles;
                const active = p.id === activeProfileId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProfileId(p.id)}
                    title={p.prompt}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-[0_0_0_0.5px_var(--color-line-strong)]"
                        : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <Icon size={14} /> {p.name}
                  </button>
                );
              })}
            </div>
            <span className="ml-auto text-[10px] text-[var(--color-ink-3)]">{modelLabel(model)}</span>
          </div>

          {/* messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.role === "assistant" ? <ChatMarkdown text={m.text} onLink={onLink} /> : m.text}
              </Bubble>
            ))}
            {typing && (
              <Bubble role="assistant">
                <span className="whitespace-pre-wrap">{typing.text.slice(0, shown)}</span>
                <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-[var(--color-brand-500)] align-middle" />
              </Bubble>
            )}
            {busy && !typing && (
              <Bubble role="assistant">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </span>
              </Bubble>
            )}
            <div ref={endRef} />
          </div>

          {/* input */}
          <div className="flex items-center gap-2 border-t border-[var(--color-line)] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Ask as ${activeProfile?.name ?? "Analyst"}…`}
              className="flex-1 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]"
            />
            <button
              onClick={send}
              disabled={busy || !!typing}
              className="flex items-center justify-center rounded-md border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] p-2 text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50"
            >
              <IconSend size={16} />
            </button>
          </div>
          {source === "local" && (
            <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-3.5 py-1.5 text-[10px] text-[var(--color-ink-3)]">
              Offline demo replies — deploy with the Gemini key for live answers.
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
          role === "user"
            ? "bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ExportItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]">
      {icon} {label}
    </button>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-ink-3)]" style={{ animationDelay: delay }} />;
}
