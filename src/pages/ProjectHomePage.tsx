import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { profileProject } from "../lib/dataProfile";
import { tierCatalog, resolveIndustryKey, dataGuide, type CatalogEntry } from "../lib/widgetCatalog";
import { INDUSTRIES, MODULES, type ModuleKey } from "../lib/dashboardModel";
import { aiChat, type AiSource } from "../lib/ai";
import BuildDashboards from "../components/BuildDashboards";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import {
  IconArrowLeft, IconArrowRight, IconSparkles, IconCheck, IconSpinner,
  IconFile, IconChart, IconDashboard,
} from "../components/icons";
import { ProjectDataManager, ScenarioBackground, ReadinessBar } from "./DataManagerPage";

const moduleLabel = (m: ModuleKey) => MODULES.find((x) => x.key === m)?.label ?? m;
const MODULE_ORDER: ModuleKey[] = ["overview", "demand", "supply", "capacity"];

type Step = "data" | "review" | "dashboards";
const STEPS: { key: Step; label: string; hint: string; icon: typeof IconFile }[] = [
  { key: "data", label: "Data", hint: "Import & validate", icon: IconFile },
  { key: "review", label: "Review & ideas", hint: "Quality, context, AI ideas", icon: IconChart },
  { key: "dashboards", label: "Dashboards", hint: "Generate & open", icon: IconDashboard },
];

export default function ProjectHomePage() {
  const { id } = useParams();
  const { projects } = useProjects();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);

  const profile = useMemo(() => (project ? profileProject(project) : null), [project]);
  const [step, setStep] = useState<Step>("data");

  if (!project || !profile) {
    return (
      <div>
        <Button onClick={() => navigate("/workspace")}><IconArrowLeft size={14} /> Projects</Button>
        <p className="mt-4 text-[13px] text-[var(--color-ink-2)]">Project not found.</p>
      </div>
    );
  }

  const requiredTemplates = profile.templates.filter((t) => t.requirement === "required");
  const hasAnyData = profile.templates.some((t) => t.uploaded);
  const dataReady = requiredTemplates.length > 0 && requiredTemplates.every((t) => t.uploaded);

  // Guided gating: a step is reachable only once its prerequisite is met.
  const reachable: Record<Step, boolean> = { data: true, review: hasAnyData, dashboards: dataReady };
  const done: Record<Step, boolean> = { data: hasAnyData, review: dataReady, dashboards: false };

  return (
    <div className="space-y-5">
      {/* header — no "open tool" shortcut; the guided steps lead there */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate("/workspace")} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]">
          <IconArrowLeft size={14} /> Projects
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold">{project.name}</h1>
          <p className="text-[12.5px] text-[var(--color-ink-2)]">{project.industry} · {project.factory}</p>
        </div>
      </div>

      {/* step rail */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const active = step === s.key;
          const ok = done[s.key];
          const open = reachable[s.key];
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <button
                disabled={!open}
                onClick={() => open && setStep(s.key)}
                title={open ? s.hint : "Complete the previous step first"}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  active ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]"
                  : open ? "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)] opacity-55"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  ok ? "bg-[var(--color-good)] text-white" : active ? "bg-[var(--color-brand-600)] text-white" : "bg-[var(--color-gray-200)] text-[var(--color-ink-2)]"
                }`}>
                  {ok ? <IconCheck size={13} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Icon size={14} /> {s.label}</span>
                  <span className="block truncate text-[10.5px] text-[var(--color-ink-3)]">{s.hint}</span>
                </span>
              </button>
              {i < STEPS.length - 1 && <IconArrowRight size={16} className="shrink-0 text-[var(--color-ink-3)]" />}
            </div>
          );
        })}
      </div>

      {/* step content */}
      {step === "data" && (
        <div className="space-y-4">
          <ProjectDataManager project={project} />
          <div className="flex justify-end">
            <Button variant="primary" disabled={!hasAnyData} onClick={() => setStep("review")}>
              Continue to review <IconArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <ReviewStep
          project={project}
          onBack={() => setStep("data")}
          onNext={() => setStep("dashboards")}
          canContinue={dataReady}
        />
      )}

      {step === "dashboards" && <BuildDashboards project={project} />}
    </div>
  );
}

function ReviewStep({ project, onBack, onNext, canContinue }: {
  project: ReturnType<typeof useProjects>["projects"][number];
  onBack: () => void; onNext: () => void; canContinue: boolean;
}) {
  const profile = useMemo(() => profileProject(project), [project]);
  const industry = resolveIndustryKey(project.industry);
  const tiers = useMemo(() => tierCatalog(profile, industry), [profile, industry]);
  const uploaded = profile.templates.filter((t) => t.uploaded).length;
  const industryLabel = industry ? (INDUSTRIES.find((i) => i.key === industry)?.label ?? industry) : "Not set";

  return (
    <div className="space-y-4">
      <ReadinessBar project={project} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreTile label="Files uploaded" value={`${uploaded}/${profile.templates.length}`} />
        <ScoreTile label="Industry" value={industryLabel} />
        <ScoreTile label="Widgets ready" value={String(tiers.ready.length)} tone="good" />
        <ScoreTile label="Locked (need data)" value={String(tiers.locked.length)} tone={tiers.locked.length ? "warn" : "neutral"} />
      </div>

      <ScenarioBackground project={project} />
      {!project.background && !project.description && (
        <Card><p className="text-[12.5px] text-[var(--color-ink-2)]">No background captured yet — you can add it in project settings later. It also grounds the AI ideas below.</p></Card>
      )}

      <ReadyWidgetsPreview ready={tiers.ready} />
      <AiIdeas profile={profile} industry={industry} />

      <div className="flex items-center justify-between">
        <Button onClick={onBack}><IconArrowLeft size={14} /> Back to data</Button>
        <Button variant="primary" disabled={!canContinue} onClick={onNext}>
          Continue to dashboards <IconArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

// AI ideas — shows a grounded recommendation immediately (works offline),
// and can ask Gemini to expand it when the endpoint is available.
function expandedGuide(profile: ReturnType<typeof profileProject>, industry: ReturnType<typeof resolveIndustryKey>): string {
  const { ready, locked } = tierCatalog(profile, industry);
  const lines: string[] = [];
  for (const m of MODULE_ORDER) {
    const items = ready.filter((e) => e.module === m);
    if (!items.length) continue;
    lines.push(`**${moduleLabel(m)}** — ${items.map((e) => e.title).join(", ")}.`);
  }
  if (locked.length) {
    const need = [...new Set(locked.flatMap((l) => l.missing.map((x) => x.templateId)))];
    lines.push(`To unlock ${locked.length} more (${locked.slice(0, 4).map((l) => l.entry.title).join(", ")}…), upload: ${need.join(", ")}.`);
  }
  lines.push("Next: go to Dashboards to pick these and add custom widgets.");
  return lines.join("\n");
}

function AiIdeas({ profile, industry }: { profile: ReturnType<typeof profileProject>; industry: ReturnType<typeof resolveIndustryKey> }) {
  const grounded = useMemo(() => dataGuide(profile, industry), [profile, industry]);
  const [text, setText] = useState<string>(grounded);
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    const res = await aiChat(
      [{ role: "user", text: "Based on the data summary, recommend which dashboard widgets to start with and what to upload next. Be concise and specific." }],
      grounded,
    );
    // Gemini if available; otherwise expand the grounded guidance (so the
    // button always does something visible, even offline).
    setText(res.source === "gemini" ? res.text : `${grounded}\n\n${expandedGuide(profile, industry)}`);
    setSource(res.source);
    setLoading(false);
  }

  return (
    <Card>
      <CardTitle right={
        <Button onClick={ask} disabled={loading}>
          {loading ? <IconSpinner size={14} /> : <IconSparkles size={14} />} {loading ? "Thinking…" : "Ask AI for more"}
        </Button>
      }>
        Ideas from your data
      </CardTitle>
      <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-ink)]">
        <div className="mb-1.5 flex items-center gap-2">
          <IconSparkles size={13} />
          <span className="text-[11px] font-semibold text-[var(--color-ink-2)]">Recommendation</span>
          <Tag tone={source === "gemini" ? "accent" : "neutral"}>{source === "gemini" ? "Gemini" : "from your data"}</Tag>
        </div>
        <MdText text={text} />
      </div>
    </Card>
  );
}

function ReadyWidgetsPreview({ ready }: { ready: CatalogEntry[] }) {
  if (!ready.length) return null;
  return (
    <Card>
      <CardTitle>Widgets ready from your data <span className="font-normal text-[var(--color-ink-3)]">· {ready.length}</span></CardTitle>
      <div className="space-y-3">
        {MODULE_ORDER.map((m) => {
          const items = ready.filter((e) => e.module === m);
          if (!items.length) return null;
          return (
            <div key={m}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">{moduleLabel(m)}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => (
                  <div key={e.key} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold"><IconCheck size={12} className="text-[var(--color-good-2)]" /> {e.title}</div>
                    <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--color-ink-3)]">{e.blurb}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] text-[var(--color-ink-3)]">You'll pick which of these to place — and add custom widgets — in the next step.</p>
    </Card>
  );
}

// Tiny markdown renderer: **bold**, bullet lines, and area headings.
function MdText({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^[-*•]\s/.test(t)) return <div key={i} className="flex gap-1.5 pl-1"><span className="text-[var(--color-brand-600)]">•</span><span>{inline(t.replace(/^[-*•]\s/, ""))}</span></div>;
        return <div key={i}>{inline(t)}</div>;
      })}
    </div>
  );
}

function ScoreTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "neutral" }) {
  const color = tone === "good" ? "text-[var(--color-good-2)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]";
  return (
    <Card>
      <div className="text-[11px] text-[var(--color-ink-3)]">{label}</div>
      <div className={`mt-0.5 truncate text-[20px] font-semibold ${color}`}>{value}</div>
    </Card>
  );
}
