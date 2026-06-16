import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useProjects, activeVersion, findFile,
  type FileVersion, type Project, type ProjectFile,
} from "../lib/projects";
import {
  TEMPLATES, REQUIREMENT_META, templateToCsv, detectTemplate,
  type DataTemplate, type Requirement,
} from "../lib/templates";
import { parseCsv, triggerDownload } from "../lib/csv";
import { runDataCheck, type DataCheckResult } from "../lib/dataCheck";
import { aiDataNarrative, type AiSource } from "../lib/ai";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import CsvModal from "../components/CsvModal";
import {
  IconArrowLeft, IconArrowRight, IconUpload, IconDownload,
  IconFile, IconSparkles, IconDots, IconEye, IconSpinner,
} from "../components/icons";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;
const LEVELS: Requirement[] = ["required", "recommended", "optional"];

// Shared column widths so the required / recommended / optional tables
// all line up vertically (each is its own <table>).
function FileCols() {
  return (
    <colgroup>
      <col className="w-8" />
      <col />
      <col className="w-[70px]" />
      <col className="w-[104px]" />
      <col className="w-[78px]" />
      <col className="w-[136px]" />
      <col className="w-[112px]" />
    </colgroup>
  );
}

function fmtDate(ts: number) {
  if (!ts) return "seeded";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type ModalState = { template: DataTemplate; version: FileVersion } | null;

export default function DataManagerPage() {
  const { id } = useParams();
  const { projects, setActiveProject, addFileVersion } = useProjects();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);

  const smartInput = useRef<HTMLInputElement>(null);
  const [smartMsg, setSmartMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  if (!project) {
    return (
      <div>
        <Button onClick={() => navigate("/workspace")}><IconArrowLeft size={14} /> Back</Button>
        <p className="mt-4 text-[13px] text-[var(--color-ink-2)]">Project not found.</p>
      </div>
    );
  }

  async function onSmartUpload(file: File) {
    const text = await file.text();
    const { headers } = parseCsv(text);
    const match = detectTemplate(headers);
    if (!match) {
      setSmartMsg(`Couldn't match "${file.name}" to a template. Check the header row.`);
      return;
    }
    await addFileVersion(project!.id, match.template.id, file.name, text);
    setSmartMsg(`Matched "${file.name}" → ${match.template.title} (${Math.round(match.score * 100)}% column match) and filed it as a new version.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate("/workspace")} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]">
          <IconArrowLeft size={14} /> Projects
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold">{project.name}</h1>
          <p className="text-[12.5px] text-[var(--color-ink-2)]">{project.industry} · {project.factory}</p>
        </div>
        <Button variant="primary" className="ml-auto" onClick={() => { setActiveProject(project.id); navigate("/tool/overview"); }}>
          Open S&OP tool <IconArrowRight size={14} />
        </Button>
      </div>

      <ScenarioBackground project={project} />
      <ReadinessBar project={project} />
      <AiCheckPanel project={project} />

      {/* smart upload */}
      <Card>
        <CardTitle right={<Tag tone="info">AI mix & match</Tag>}>Smart upload — drop any file, we route it</CardTitle>
        <p className="mb-3 text-[12.5px] text-[var(--color-ink-2)]">
          Upload a CSV and the system matches its columns to the right template automatically, validates it, and files it as a new version (superseding the old one — older versions stay available below).
        </p>
        <input ref={smartInput} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onSmartUpload(f); e.target.value = ""; }} />
        <Button onClick={() => smartInput.current?.click()}><IconUpload size={14} /> Choose a CSV</Button>
        {smartMsg && <div className="mt-3 rounded-md bg-[var(--color-brand-50)] px-3 py-2 text-[12px] text-[var(--color-brand-700)]">{smartMsg}</div>}
      </Card>

      {/* file table grouped by requirement level */}
      {LEVELS.map((level) => {
        const templates = TEMPLATES.filter((t) => t.requirement === level);
        return (
          <section key={level}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: REQUIREMENT_META[level].bar }} />
              <h2 className="text-[14px] font-semibold">{REQUIREMENT_META[level].label} files</h2>
              <Tag tone={REQUIREMENT_META[level].tone}>{REQUIREMENT_META[level].blurb}</Tag>
            </div>
            <Card pad={false}>
              <table className="w-full table-fixed text-[12.5px]">
                <FileCols />
                <thead>
                  <tr className="text-left text-[11px] text-[var(--color-ink-2)]">
                    <th className="py-2 pl-3"></th>
                    <th className="px-2 py-2 font-medium">File</th>
                    <th className="px-2 py-2 font-medium">Version</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium">Rows</th>
                    <th className="px-2 py-2 font-medium">Updated</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <FileRows key={t.id} project={project} template={t} onView={(v) => setModal({ template: t, version: v })} />
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}

      {modal && <CsvModal template={modal.template} version={modal.version} onClose={() => setModal(null)} />}
    </div>
  );
}

function FileRows({
  project, template, onView,
}: {
  project: Project;
  template: DataTemplate;
  onView: (v: FileVersion) => void;
}) {
  const { addFileVersion, setActiveFileVersion, deleteFileVersion } = useProjects();
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const file = findFile(project, template.id);
  const active = file ? activeVersion(file) : undefined;
  const versionCount = file?.versions.length ?? 0;

  async function onUpload(f: File) {
    const text = await f.text();
    await addFileVersion(project.id, template.id, f.name, text);
    setExpanded(true);
  }

  return (
    <>
      <tr className="border-t border-[var(--color-line)]">
        <td className="py-2.5 pl-3 align-top">
          {versionCount > 1 ? (
            <button onClick={() => setExpanded((e) => !e)} className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]" aria-label="Toggle versions">
              <span className={`inline-block transition-transform ${expanded ? "rotate-90" : ""}`}>▸</span>
            </button>
          ) : null}
        </td>
        <td className="px-2 py-2.5 align-top">
          <div className="flex items-center gap-2">
            <IconFile size={15} />
            <span className="font-semibold">{template.title}</span>
            <span className="truncate font-mono text-[10px] text-[var(--color-ink-3)]">{template.file}</span>
            <Tag tone={template.module === "Master" ? "neutral" : template.module === "Demand" ? "info" : template.module === "Supply" ? "accent" : "warn"}>{template.module}</Tag>
          </div>
          {active ? (
            <div className="mt-0.5 truncate text-[11px] text-[var(--color-ink-3)]">
              {active.fileName}
              {active.coverage && <> · {active.coverage.start}…{active.coverage.end}</>}
            </div>
          ) : (
            <div className="mt-0.5 text-[11px] text-[var(--color-ink-3)]">Not uploaded yet</div>
          )}
          {active && active.issues.length > 0 && (
            <div className="mt-0.5 text-[11px] text-[var(--color-warn)]">⚠ {active.issues.join(" · ")}</div>
          )}
        </td>
        <td className="px-2 py-2.5 align-top text-[11px]">
          {active ? (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-semibold text-[var(--color-ink)]">v{active.version}</span>
              {versionCount > 1 && <span className="text-[var(--color-ink-3)]">/ {versionCount}</span>}
            </span>
          ) : <span className="text-[var(--color-ink-3)]">—</span>}
        </td>
        <td className="px-2 py-2.5 align-top">
          {active ? <Tag tone={STATUS_TONE[active.status]}>{active.status}</Tag>
            : <Tag tone={REQUIREMENT_META[template.requirement].tone}>{REQUIREMENT_META[template.requirement].label}</Tag>}
        </td>
        <td className="px-2 py-2.5 text-right align-top tabular-nums">{active ? active.rows.toLocaleString() : "—"}</td>
        <td className="px-2 py-2.5 align-top text-[11px] text-[var(--color-ink-2)]">{active ? fmtDate(active.uploadedAt) : "—"}</td>
        <td className="px-3 py-2.5 align-top">
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <RowActions
            hasActive={!!active}
            onView={() => active && onView(active)}
            onUpload={() => input.current?.click()}
            onDownloadActive={() => active && triggerDownload(active.fileName, active.content)}
            onDownloadTemplate={() => triggerDownload(template.file, templateToCsv(template))}
          />
        </td>
      </tr>

      {expanded && file && versionCount > 1 && (
        <tr className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <td></td>
          <td colSpan={6} className="py-1 pr-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">Version history — select the active one</div>
            {[...file.versions].reverse().map((v) => (
              <VersionRow key={v.id} file={file} version={v}
                onActivate={() => setActiveFileVersion(project.id, template.id, v.id)}
                onDelete={() => deleteFileVersion(project.id, template.id, v.id)}
                onView={() => onView(v)} />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}

/** Row action cluster: a primary View (eye) when a file exists, plus a
 *  three-dots menu holding upload / download actions (one solid control). */
function RowActions({
  hasActive, onView, onUpload, onDownloadActive, onDownloadTemplate,
}: {
  hasActive: boolean;
  onView: () => void;
  onUpload: () => void;
  onDownloadActive: () => void;
  onDownloadTemplate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const item = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]";
  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {hasActive ? (
        <button onClick={onView} title="View data" className="rounded-md border border-[var(--color-line-strong)] p-1.5 text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]">
          <IconEye size={14} />
        </button>
      ) : (
        <Button onClick={onUpload}><IconUpload size={13} /> Upload</Button>
      )}
      <div ref={ref} className="relative">
        <button onClick={() => setOpen((o) => !o)} title="More actions" aria-label="More actions"
          className="rounded-md border border-[var(--color-line-strong)] p-1.5 text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]">
          <IconDots size={14} />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-xl">
            {hasActive && <button className={item} onClick={run(onUpload)}><IconUpload size={13} /> Upload new version</button>}
            {hasActive && <button className={item} onClick={run(onDownloadActive)}><IconDownload size={13} /> Download active CSV</button>}
            <button className={item} onClick={run(onDownloadTemplate)}><IconFile size={13} /> Download blank template</button>
          </div>
        )}
      </div>
    </div>
  );
}

function VersionRow({
  file, version, onActivate, onDelete, onView,
}: {
  file: ProjectFile;
  version: FileVersion;
  onActivate: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const isActive = version.id === file.activeVersionId;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-line)] py-1.5 text-[11.5px] last:border-0">
      <label className="flex cursor-pointer items-center gap-1.5">
        <input type="radio" checked={isActive} onChange={onActivate} className="accent-[var(--color-brand-600)]" />
        <span className="font-medium">v{version.version}</span>
      </label>
      <span className="text-[var(--color-ink-2)]">{version.fileName}</span>
      <span className="text-[var(--color-ink-3)]">{version.rows.toLocaleString()} rows</span>
      <span className="text-[var(--color-ink-3)]">{fmtDate(version.uploadedAt)}</span>
      <Tag tone={STATUS_TONE[version.status]}>{version.status}</Tag>
      {isActive && <Tag tone="good">active</Tag>}
      <div className="ml-auto flex items-center gap-2.5">
        <button onClick={onView} className="font-medium text-[var(--color-brand-600)] hover:underline">View</button>
        <button onClick={() => triggerDownload(version.fileName, version.content)} className="font-medium text-[var(--color-ink-2)] hover:underline">Download</button>
        <button onClick={onDelete} className="font-medium text-[var(--color-bad)] hover:underline">Delete</button>
      </div>
    </div>
  );
}

function ScenarioBackground({ project }: { project: Project }) {
  const bg = (project.background ?? "").trim();
  if (!bg && !project.description) return null;
  return (
    <Card>
      <CardTitle right={<Tag tone="info">{project.currency} · {project.factory.split("·")[0].trim()}</Tag>}>
        Scenario background
      </CardTitle>
      {project.description && (
        <p className="mb-2 text-[13px] font-medium text-[var(--color-ink)]">{project.description}</p>
      )}
      {bg && (
        <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">{bg}</p>
      )}
    </Card>
  );
}

function ReadinessBar({ project }: { project: Project }) {
  const check = useMemo(() => runDataCheck(project), [project]);
  const errors = check.findings.filter((f) => f.severity === "error").length;
  const warnings = check.findings.filter((f) => f.severity === "warning").length;
  const verdict =
    errors > 0 ? `${errors} blocker${errors > 1 ? "s" : ""} — core modules can't run yet`
    : warnings > 0 ? `Ready to plan · ${warnings} thing${warnings > 1 ? "s" : ""} to tidy`
    : "Ready to plan · all checks passed";
  const verdictTone = errors > 0 ? "var(--color-bad)" : warnings > 0 ? "var(--color-warn)" : "var(--color-good)";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-[16px] font-bold text-white"
            style={{ background: check.score >= 80 ? "#1d9e75" : check.score >= 50 ? "#e08a1e" : "#e24b4a" }}>
            {check.score}
          </div>
          <div>
            <div className="text-[13px] font-semibold">Data readiness <span className="font-normal text-[var(--color-ink-3)]">/ 100</span></div>
            <div className="text-[11px] font-medium" style={{ color: verdictTone }}>{verdict}</div>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-4">
          {LEVELS.map((lvl) => {
            const c = check.completeness[lvl];
            const detail = c.missing.length === 0
              ? "all loaded"
              : `missing: ${c.missing.join(", ")}`;
            return (
              <div key={lvl} className="min-w-[150px] flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-2)]">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: REQUIREMENT_META[lvl].bar }} />
                  {REQUIREMENT_META[lvl].label}
                </div>
                <div className="text-[18px] font-semibold">{c.present}<span className="text-[13px] text-[var(--color-ink-3)]">/{c.total}</span></div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${(c.present / c.total) * 100}%`, background: REQUIREMENT_META[lvl].bar }} />
                </div>
                <div className={`mt-1 truncate text-[10.5px] ${c.missing.length ? "text-[var(--color-ink-2)]" : "text-[var(--color-good-2)]"}`} title={detail}>{detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

const SEV_RANK = { error: 0, warning: 1, info: 2, ok: 3 } as const;
const SEV_TONE_AI = { error: "bad", warning: "warn", info: "info", ok: "good" } as const;
type Severity = keyof typeof SEV_RANK;

function AiCheckPanel({ project }: { project: Project }) {
  const [result, setResult] = useState<DataCheckResult | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState<Set<Severity>>(new Set());

  async function run() {
    setLoading(true);
    setNarrative(null);
    const res = runDataCheck(project);
    setResult(res);
    const ai = await aiDataNarrative(res.promptSummary);
    setNarrative(ai.text);
    setSource(ai.source);
    setLoading(false);
  }

  const severities = result ? [...new Set(result.findings.map((f) => f.severity))].sort((a, b) => SEV_RANK[a] - SEV_RANK[b]) : [];
  const toggle = (s: Severity) => setHidden((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const rows = result
    ? [...result.findings].filter((f) => !hidden.has(f.severity)).sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
    : [];

  return (
    <Card>
      <CardTitle right={
        <Button variant="primary" onClick={run} disabled={loading}>
          {loading ? <IconSpinner size={14} /> : <IconSparkles size={14} />} {loading ? "Checking…" : result ? "Re-run AI data check" : "Run AI data check"}
        </Button>
      }>
        AI data check — completeness, gaps & consistency
      </CardTitle>

      {!result && !loading && (
        <p className="text-[12.5px] text-[var(--color-ink-2)]">
          Scans every file: missing required data, time pockets (missing months), and cross-file mismatches (e.g. SKUs not in the master). Then Gemini writes a plain-language summary of what to fix and why it matters.
        </p>
      )}

      {loading && !result && (
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-2)]">
          <IconSpinner size={15} className="text-[var(--color-brand-600)]" /> Scanning files and asking Gemini…
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-[var(--color-ink-2)]">Automated findings</span>
              <span className="text-[11px] text-[var(--color-ink-3)]">({rows.length}{hidden.size > 0 && ` of ${result.findings.length}`})</span>
              <div className="ml-auto flex items-center gap-1">
                {severities.map((s) => {
                  const off = hidden.has(s);
                  return (
                    <button key={s} onClick={() => toggle(s)}
                      title={off ? `Show ${s}` : `Hide ${s}`}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-opacity ${off ? "opacity-35" : ""}`}
                      style={{ background: tintFor(s).bg, color: tintFor(s).fg }}>
                      {s} {result.findings.filter((f) => f.severity === s).length}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-[var(--color-line)]">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-[var(--color-surface-2)] text-[10.5px] text-[var(--color-ink-2)]">
                  <tr>
                    <th className="w-20 px-2.5 py-1.5 font-medium">Severity</th>
                    <th className="px-2.5 py-1.5 font-medium">Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f, i) => (
                    <tr key={i} className="border-t border-[var(--color-line)] align-top">
                      <td className="px-2.5 py-1.5"><Tag tone={SEV_TONE_AI[f.severity]}>{f.severity}</Tag></td>
                      <td className="px-2.5 py-1.5">
                        <div className="font-medium text-[var(--color-ink)]">{f.title}</div>
                        <div className="text-[11px] text-[var(--color-ink-2)]">{f.detail}</div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={2} className="px-2.5 py-3 text-center text-[var(--color-ink-3)]">No findings match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink-2)]">
              <IconSparkles size={14} /> AI summary
              {source && <Tag tone={source === "gemini" ? "accent" : "neutral"}>{source === "gemini" ? "Gemini" : "local"}</Tag>}
            </div>
            <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-ink)]">
              {loading
                ? <div className="flex items-center gap-2 text-[var(--color-ink-2)]"><IconSpinner size={14} className="text-[var(--color-brand-600)]" /> Writing the summary…</div>
                : <MarkdownLite text={narrative ?? ""} />}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// Inline tint for the severity filter chips (matches the Tag tones).
function tintFor(s: Severity) {
  switch (s) {
    case "error": return { bg: "#FCEBEB", fg: "#A32D2D" };
    case "warning": return { bg: "#FAEEDA", fg: "#854F0B" };
    case "info": return { bg: "#E6F1FB", fg: "#185FA5" };
    default: return { bg: "#EAF3DE", fg: "#3B6D11" };
  }
}

/** Tiny markdown renderer for the AI summary (headings, bullets, bold). */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^#{1,3}\s/.test(t))
          return <div key={i} className="pt-1 text-[12px] font-semibold text-[var(--color-ink)]">{inline(t.replace(/^#{1,3}\s/, ""))}</div>;
        if (/^[-*•]\s/.test(t))
          return <div key={i} className="flex gap-1.5 pl-1"><span className="text-[var(--color-brand-600)]">•</span><span>{inline(t.replace(/^[-*•]\s/, ""))}</span></div>;
        return <div key={i}>{inline(t)}</div>;
      })}
    </div>
  );
}
function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
