import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProjects } from "../lib/projects";
import { useAuth } from "../lib/auth";
import { profileProject, type DataProfile, type TemplateProfile } from "../lib/dataProfile";
import {
  tierCatalog, resolveIndustryKey, WIDGET_CATALOG,
  type CatalogEntry, type MissingReq,
} from "../lib/widgetCatalog";
import { placeFromCatalog } from "../lib/dashboardGenerator";
import {
  buildBlueprint, downloadBlueprint, parseBlueprint, contractGaps,
  type BlueprintDashboard, type Blueprint,
} from "../lib/blueprint";
import { MODULES, INDUSTRIES, type ModuleKey } from "../lib/dashboardModel";
import type { DashboardPage, PlacedWidget } from "../lib/dashboards";
import { aiChat, type AiSource } from "../lib/ai";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import {
  IconArrowLeft, IconArrowRight, IconSparkles, IconCheck, IconAlert,
  IconUpload, IconDownload, IconBolt, IconSpinner,
} from "../components/icons";

const QUALITY_TONE = { good: "good", warning: "warn", error: "bad", missing: "neutral" } as const;
const MODULE_ORDER: ModuleKey[] = ["overview", "demand", "supply", "capacity"];
const moduleLabel = (m: ModuleKey) => MODULES.find((x) => x.key === m)?.label ?? m;

export default function DashboardSetupPage() {
  const { id } = useParams();
  const { projects, setActiveProject } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createMut = useMutation(api.dashboards.create);

  const project = projects.find((p) => p.id === id);
  const profile = useMemo(() => (project ? profileProject(project) : null), [project]);
  const industry = useMemo(() => resolveIndustryKey(project?.industry), [project]);
  const tiers = useMemo(() => (profile ? tierCatalog(profile, industry) : null), [profile, industry]);

  // Selection — default to the highlighted ("most interesting") ready widgets.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (tiers) setSelected(new Set(tiers.ready.filter((e) => e.highlight).map((e) => e.key)));
  }, [tiers]);

  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ tone: "good" | "warn" | "bad"; text: string } | null>(null);

  if (!project || !profile || !tiers) {
    return (
      <div>
        <Button onClick={() => navigate("/workspace")}><IconArrowLeft size={14} /> Projects</Button>
        <p className="mt-4 text-[13px] text-[var(--color-ink-2)]">Project not found.</p>
      </div>
    );
  }

  const selectedEntries = WIDGET_CATALOG.filter((e) => selected.has(e.key));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  // Group the chosen widgets into one starter dashboard per page.
  function dashboardsByPage(): Record<DashboardPage, BlueprintDashboard[]> {
    const out: Record<DashboardPage, BlueprintDashboard[]> = { overview: [], demand: [], supply: [], capacity: [] };
    for (const page of MODULE_ORDER) {
      const entries = selectedEntries.filter((e) => e.module === page);
      if (!entries.length) continue;
      const widgets: PlacedWidget[] = [
        ...entries.filter((e) => e.widgetId === "stat").map((e) => ({ ...placeFromCatalog(e), w: 2, h: 1 })),
        ...entries.filter((e) => e.widgetId !== "stat").map(placeFromCatalog),
      ];
      out[page] = [{
        name: `${moduleLabel(page)} (generated)`,
        icon: page === "overview" ? "dashboard" : page === "demand" ? "chart" : page === "supply" ? "factory" : "box",
        description: "Generated from your data in setup — customise freely.",
        widgets,
      }];
    }
    return out;
  }

  async function generate() {
    if (!project || !selectedEntries.length) return;
    setBusy(true);
    const byPage = dashboardsByPage();
    for (const page of MODULE_ORDER) {
      for (const dash of byPage[page]) {
        await createMut({
          projectId: project.id as never,
          owner: user?.email ?? "unknown",
          name: dash.name,
          icon: dash.icon,
          description: dash.description,
          page,
          widgets: dash.widgets as never,
        });
      }
    }
    setActiveProject(project.id);
    setBusy(false);
    navigate("/tool/overview");
  }

  function exportBlueprint() {
    if (!project) return;
    const bp = buildBlueprint({
      name: `${project.name} blueprint`,
      industry,
      createdBy: user?.email ?? "unknown",
      createdAt: project.createdAt || 0,
      notes: `Exported from ${project.name}.`,
      dashboardsByPage: dashboardsByPage(),
    });
    downloadBlueprint(bp);
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const res = parseBlueprint(text);
    if (!res.ok) {
      setImportMsg({ tone: "bad", text: res.error });
      return;
    }
    await applyBlueprint(res.blueprint);
  }

  async function applyBlueprint(bp: Blueprint) {
    if (!project) return;
    setBusy(true);
    const gaps = contractGaps(bp, profile!.uploadedIds);
    for (const page of bp.pages) {
      for (const dash of page.dashboards) {
        await createMut({
          projectId: project.id as never,
          owner: user?.email ?? "unknown",
          name: dash.name,
          icon: dash.icon,
          description: dash.description ?? `From blueprint "${bp.name}"`,
          page: page.page,
          widgets: dash.widgets as never,
        });
      }
    }
    setBusy(false);
    setImportMsg(
      gaps.missing.length
        ? { tone: "warn", text: `Applied "${bp.name}". Still upload: ${gaps.missing.map((m) => m.templateId).join(", ")} — some widgets stay empty until then.` }
        : { tone: "good", text: `Applied "${bp.name}". All required data present — open the tool to see it.` }
    );
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(`/workspace/project/${project.id}`)} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]">
          <IconArrowLeft size={14} /> Data
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold">Set up dashboards</h1>
          <p className="text-[12.5px] text-[var(--color-ink-2)]">
            {project.name} · we read your data, you pick the widgets, then generate the dashboards.
          </p>
        </div>
      </div>

      {/* STEP 1 — review the data */}
      <StepHeader n={1} title="What we see in your data" sub="Each widget below is unlocked by the data you've uploaded." />
      <DataReview profile={profile} industryLabel={industry ? (INDUSTRIES.find((i) => i.key === industry)?.label ?? industry) : null} readyCount={tiers.ready.length} lockedCount={tiers.locked.length} />
      <AiGuide profile={profile} readyCount={tiers.ready.length} lockedCount={tiers.locked.length} />

      {/* STEP 2 — pick widgets */}
      <StepHeader n={2} title="Choose your widgets" sub={`${selected.size} selected · highlighted = recommended starting set`} />
      <WidgetGallery
        ready={tiers.ready}
        locked={tiers.locked}
        notRelevant={tiers.notRelevant}
        selected={selected}
        onToggle={toggle}
        onSelectAllReady={() => setSelected(new Set(tiers.ready.map((e) => e.key)))}
        onResetRecommended={() => setSelected(new Set(tiers.ready.filter((e) => e.highlight).map((e) => e.key)))}
      />

      {/* STEP 3 — generate */}
      <StepHeader n={3} title="Generate the dashboards" sub="Creates one starter dashboard per page; you can customise after." />
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {MODULE_ORDER.map((page) => {
              const c = selectedEntries.filter((e) => e.module === page).length;
              return (
                <div key={page} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-center">
                  <div className="text-[11px] text-[var(--color-ink-2)]">{moduleLabel(page)}</div>
                  <div className="text-[18px] font-semibold tabular-nums">{c}</div>
                  <div className="text-[10px] text-[var(--color-ink-3)]">widget{c === 1 ? "" : "s"}</div>
                </div>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="primary" onClick={generate} disabled={busy || selectedEntries.length === 0}>
              {busy ? <IconSpinner size={14} /> : <IconBolt size={14} />} Create dashboards
            </Button>
          </div>
        </div>
      </Card>

      {/* Blueprint — the portable Mutares playbook */}
      <StepHeader n={4} title="Blueprint — share across the portfolio" sub="Export this dashboard set as a reusable playbook, or import one Mutares prepared." />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-[12.5px] text-[var(--color-ink-2)]">
            A blueprint captures the widgets, layout and the <strong>data contract</strong> (which CSVs &amp; columns it needs) — never your data. Import it into another company, fill the templates, and the same dashboards light up.
          </div>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }} />
          <Button onClick={() => importRef.current?.click()} disabled={busy}><IconUpload size={14} /> Import blueprint</Button>
          <Button variant="primary" onClick={exportBlueprint} disabled={selectedEntries.length === 0}><IconDownload size={14} /> Export blueprint</Button>
        </div>
        {importMsg && (
          <div className="mt-3"><Tag tone={importMsg.tone}>{importMsg.text}</Tag></div>
        )}
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={() => { setActiveProject(project.id); navigate("/tool/overview"); }}>
          Skip — open the tool with the built-in dashboards <IconArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function StepHeader({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[12px] font-semibold text-white">{n}</span>
      <div>
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        <p className="text-[11.5px] text-[var(--color-ink-3)]">{sub}</p>
      </div>
    </div>
  );
}

function DataReview({
  profile, industryLabel, readyCount, lockedCount,
}: {
  profile: DataProfile;
  industryLabel: string | null;
  readyCount: number;
  lockedCount: number;
}) {
  const uploaded = profile.templates.filter((t) => t.uploaded);
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Metric label="Industry" value={industryLabel ?? "Not set"} />
        <Metric label="Files uploaded" value={`${uploaded.length}/${profile.templates.length}`} />
        <Metric label="Widgets ready" value={String(readyCount)} tone="good" />
        <Metric label="Locked (need data)" value={String(lockedCount)} tone={lockedCount ? "warn" : "neutral"} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {profile.templates.map((t) => <TemplateChip key={t.templateId} t={t} />)}
      </div>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "neutral" }) {
  const color = tone === "good" ? "text-[var(--color-good-2)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]";
  return (
    <div>
      <div className="text-[11px] text-[var(--color-ink-3)]">{label}</div>
      <div className={`text-[18px] font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function TemplateChip({ t }: { t: TemplateProfile }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${t.uploaded ? "border-[var(--color-line)] bg-[var(--color-surface)]" : "border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)]"}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{t.title}</span>
        <Tag tone={QUALITY_TONE[t.quality]}>{t.uploaded ? t.quality : "missing"}</Tag>
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--color-ink-3)]">
        {t.uploaded
          ? <>{t.rows.toLocaleString()} rows{t.dateCoverage ? ` · ${t.dateCoverage.start}…${t.dateCoverage.end}${t.dateCoverage.gaps ? ` · ${t.dateCoverage.gaps} gap(s)` : ""}` : ""}</>
          : <>not uploaded</>}
      </div>
      {t.uploaded && t.missingRequired.length > 0 && (
        <div className="mt-0.5 text-[10.5px] text-[var(--color-bad)]">missing column(s): {t.missingRequired.join(", ")}</div>
      )}
    </div>
  );
}

function WidgetGallery({
  ready, locked, notRelevant, selected, onToggle, onSelectAllReady, onResetRecommended,
}: {
  ready: CatalogEntry[];
  locked: { entry: CatalogEntry; missing: MissingReq[] }[];
  notRelevant: CatalogEntry[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSelectAllReady: () => void;
  onResetRecommended: () => void;
}) {
  return (
    <Card>
      <CardTitle right={
        <div className="flex items-center gap-2">
          <Button onClick={onResetRecommended}>Recommended</Button>
          <Button onClick={onSelectAllReady}>Select all ready</Button>
        </div>
      }>
        Widget catalogue
      </CardTitle>

      {/* READY — grouped by module, selectable */}
      <div className="mt-1 space-y-4">
        {MODULE_ORDER.map((m) => {
          const items = ready.filter((e) => e.module === m);
          if (!items.length) return null;
          return (
            <div key={m}>
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
                <IconCheck size={13} className="text-[var(--color-good-2)]" /> {moduleLabel(m)} · ready
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => {
                  const on = selected.has(e.key);
                  return (
                    <button key={e.key} onClick={() => onToggle(e.key)}
                      className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${on ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]" : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]"}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white" : "border-[var(--color-line-strong)]"}`}>
                          {on && <IconCheck size={11} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">{e.title}{e.highlight && <Tag tone="accent">recommended</Tag>}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-2)]">{e.blurb}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* LOCKED — the upsell */}
      {locked.length > 0 && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
            <IconAlert size={13} className="text-[var(--color-warn)]" /> Locked — upload more data to unlock
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map(({ entry, missing }) => (
              <div key={entry.key} className="rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] p-3 opacity-90">
                <div className="text-[12.5px] font-semibold text-[var(--color-ink-2)]">{entry.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-3)]">{entry.blurb}</div>
                <div className="mt-1.5 space-y-0.5">
                  {missing.map((m, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10.5px] text-[var(--color-warn)]"><IconUpload size={11} /> {m.detail}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOT RELEVANT — quiet footnote */}
      {notRelevant.length > 0 && (
        <div className="mt-4 text-[11px] text-[var(--color-ink-3)]">
          {notRelevant.length} widget(s) hidden as not relevant to this industry archetype.
        </div>
      )}
    </Card>
  );
}

// ---- AI guide (chat with the data) ----
function profileSummary(profile: DataProfile, ready: number, locked: number): string {
  const up = profile.templates.filter((t) => t.uploaded);
  const lines = up.map((t) => `- ${t.title}: ${t.rows} rows, quality ${t.quality}${t.dateCoverage ? `, covers ${t.dateCoverage.start}..${t.dateCoverage.end}` : ""}`);
  const missing = profile.templates.filter((t) => !t.uploaded).map((t) => t.title);
  return [
    `Industry: ${profile.industry}`,
    `Uploaded files (${up.length}/${profile.templates.length}):`,
    ...lines,
    missing.length ? `Not uploaded: ${missing.join(", ")}` : "All templates uploaded.",
    `${ready} dashboard widgets are data-ready; ${locked} are locked pending more data.`,
  ].join("\n");
}

function AiGuide({ profile, readyCount, lockedCount }: { profile: DataProfile; readyCount: number; lockedCount: number }) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const ctx = profileSummary(profile, readyCount, lockedCount);
    const res = await aiChat(
      [{ role: "user", text: "Based on the data I've uploaded, recommend which dashboard widgets I should add and why, and what to upload next to unlock more. Be concise and specific." }],
      ctx,
    );
    setText(res.text);
    setSource(res.source);
    setLoading(false);
  }

  return (
    <Card>
      <CardTitle right={
        <Button variant="primary" onClick={run} disabled={loading}>
          {loading ? <IconSpinner size={14} /> : <IconSparkles size={14} />} {loading ? "Thinking…" : text ? "Ask again" : "Ask the AI guide"}
        </Button>
      }>
        AI guide — what your data is telling us
      </CardTitle>
      {!text && !loading && (
        <p className="text-[12.5px] text-[var(--color-ink-2)]">
          Get a plain-language recommendation of which widgets to start with for this dataset and what to upload next.
        </p>
      )}
      {loading && <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-2)]"><IconSpinner size={14} className="text-[var(--color-brand-600)]" /> Reading your data…</div>}
      {text && (
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-ink)]">
          <div className="mb-1.5 flex items-center gap-2">
            <IconSparkles size={13} /> <span className="text-[11px] font-semibold text-[var(--color-ink-2)]">Recommendation</span>
            {source && <Tag tone={source === "gemini" ? "accent" : "neutral"}>{source === "gemini" ? "Gemini" : "local"}</Tag>}
          </div>
          {text.split("\n").map((l, i) => l.trim() ? <div key={i} className="mb-0.5">{l}</div> : null)}
        </div>
      )}
    </Card>
  );
}
