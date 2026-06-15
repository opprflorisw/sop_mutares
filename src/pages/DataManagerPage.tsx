import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useProjects,
  activeVersion,
  findFile,
  type FileVersion,
  type Project,
} from "../lib/projects";
import {
  TEMPLATES,
  REQUIREMENT_META,
  templateToCsv,
  detectTemplate,
  type DataTemplate,
  type Requirement,
} from "../lib/templates";
import { parseCsv, triggerDownload } from "../lib/csv";
import { runDataCheck, type DataCheckResult } from "../lib/dataCheck";
import { aiDataNarrative, type AiSource } from "../lib/ai";
import { Card, CardTitle, Button, Tag, PlaceholderNote } from "../components/ui";
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconDownload,
  IconFile,
  IconSparkles,
} from "../components/icons";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;
const LEVELS: Requirement[] = ["required", "recommended", "optional"];

function fmtDate(ts: number) {
  if (!ts) return "seeded";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DataManagerPage() {
  const { id } = useParams();
  const { projects, setActiveProject, addFileVersion } = useProjects();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);

  const smartInput = useRef<HTMLInputElement>(null);
  const [smartMsg, setSmartMsg] = useState<string | null>(null);

  if (!project) {
    return (
      <div>
        <Button onClick={() => navigate("/workspace")}>
          <IconArrowLeft size={14} /> Back
        </Button>
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
    addFileVersion(project!.id, match.template.id, file.name, text);
    setSmartMsg(
      `Matched "${file.name}" → ${match.template.title} (${Math.round(match.score * 100)}% column match) and added it.`
    );
  }

  function openTool() {
    setActiveProject(project!.id);
    navigate("/tool/overview");
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/workspace")}
          className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
        >
          <IconArrowLeft size={14} /> Projects
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold">{project.name}</h1>
          <p className="text-[12.5px] text-[var(--color-ink-2)]">
            {project.industry} · {project.factory}
          </p>
        </div>
        <Button variant="primary" className="ml-auto" onClick={openTool}>
          Open S&OP tool <IconArrowRight size={14} />
        </Button>
      </div>

      <ReadinessBar project={project} />

      <AiCheckPanel project={project} />

      {/* smart upload */}
      <Card>
        <CardTitle right={<Tag tone="info">AI mix & match</Tag>}>
          Smart upload — drop any file, we route it
        </CardTitle>
        <p className="mb-3 text-[12.5px] text-[var(--color-ink-2)]">
          Upload a CSV and the system matches its columns to the right template
          automatically, validates it, and files it as a new version.
        </p>
        <input
          ref={smartInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSmartUpload(f);
            e.target.value = "";
          }}
        />
        <Button onClick={() => smartInput.current?.click()}>
          <IconUpload size={14} /> Choose a CSV
        </Button>
        {smartMsg && (
          <div className="mt-3 rounded-md bg-[var(--color-brand-50)] px-3 py-2 text-[12px] text-[var(--color-brand-700)]">
            {smartMsg}
          </div>
        )}
      </Card>

      {/* file registry grouped by requirement level */}
      {LEVELS.map((level) => {
        const templates = TEMPLATES.filter((t) => t.requirement === level);
        return (
          <section key={level}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-[14px] font-semibold">{REQUIREMENT_META[level].label} files</h2>
              <Tag tone={REQUIREMENT_META[level].tone === "neutral" ? "neutral" : REQUIREMENT_META[level].tone}>
                {REQUIREMENT_META[level].blurb}
              </Tag>
            </div>
            <div className="space-y-2.5">
              {templates.map((t) => (
                <FileRow key={t.id} project={project} template={t} />
              ))}
            </div>
          </section>
        );
      })}

      <PlaceholderNote phase="Phase 1">
        Files live in the browser for this demo. With Convex active, uploads,
        versions and validation move to the persistent backend (per the team's
        dynamic-architecture decision).
      </PlaceholderNote>
    </div>
  );
}

function ReadinessBar({ project }: { project: Project }) {
  const check = useMemo(() => runDataCheck(project), [project]);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[16px] font-bold text-white"
            style={{
              background:
                check.score >= 80 ? "#1d9e75" : check.score >= 50 ? "#ef9f27" : "#e24b4a",
            }}
          >
            {check.score}
          </div>
          <div>
            <div className="text-[13px] font-semibold">Data readiness</div>
            <div className="text-[11px] text-[var(--color-ink-3)]">out of 100</div>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-4">
          {LEVELS.map((lvl) => {
            const c = check.completeness[lvl];
            return (
              <div key={lvl} className="min-w-[120px]">
                <div className="text-[11px] text-[var(--color-ink-2)]">
                  {REQUIREMENT_META[lvl].label}
                </div>
                <div className="text-[18px] font-semibold">
                  {c.present}
                  <span className="text-[13px] text-[var(--color-ink-3)]">/{c.total}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.present / c.total) * 100}%`,
                      background:
                        lvl === "required" ? "#185FA5" : lvl === "recommended" ? "#ef9f27" : "#8a929e",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function AiCheckPanel({ project }: { project: Project }) {
  const [result, setResult] = useState<DataCheckResult | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = runDataCheck(project);
    setResult(res);
    const ai = await aiDataNarrative(res.promptSummary);
    setNarrative(ai.text);
    setSource(ai.source);
    setLoading(false);
  }

  const tone = { error: "bad", warning: "warn", info: "info", ok: "good" } as const;

  return (
    <Card>
      <CardTitle
        right={
          <Button variant="primary" onClick={run} disabled={loading}>
            <IconSparkles size={14} /> {loading ? "Checking…" : "Run AI data check"}
          </Button>
        }
      >
        AI data check — completeness, gaps & consistency
      </CardTitle>

      {!result && (
        <p className="text-[12.5px] text-[var(--color-ink-2)]">
          Scans every file: missing required data, time pockets (missing months),
          and cross-file mismatches (e.g. SKUs not in the master). Then writes a
          plain-language summary of what to fix.
        </p>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink-2)]">
              Findings
            </div>
            <div className="space-y-1.5">
              {result.findings.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-[var(--color-surface-2)] px-3 py-2"
                >
                  <Tag tone={tone[f.severity]}>{f.severity}</Tag>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium">{f.title}</div>
                    <div className="text-[11px] text-[var(--color-ink-2)]">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink-2)]">
              <IconSparkles size={14} /> AI summary
              {source && (
                <Tag tone={source === "gemini" ? "accent" : "neutral"}>
                  {source === "gemini" ? "Gemini" : "local"}
                </Tag>
              )}
            </div>
            <div className="whitespace-pre-wrap rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink)]">
              {narrative}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function FileRow({ project, template }: { project: Project; template: DataTemplate }) {
  const { addFileVersion, setActiveFileVersion, deleteFileVersion } = useProjects();
  const [showHistory, setShowHistory] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const file = findFile(project, template.id);
  const active = file ? activeVersion(file) : undefined;

  async function onUpload(f: File) {
    const text = await f.text();
    addFileVersion(project.id, template.id, f.name, text);
  }

  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-ink-2)]">
          <IconFile size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{template.title}</span>
            <span className="font-mono text-[10px] text-[var(--color-ink-3)]">{template.file}</span>
            <Tag tone={template.module === "Master" ? "neutral" : template.module === "Demand" ? "info" : template.module === "Supply" ? "accent" : "warn"}>
              {template.module}
            </Tag>
          </div>
          {active ? (
            <div className="mt-0.5 text-[11px] text-[var(--color-ink-2)]">
              v{active.version} · {active.fileName} · {active.rows.toLocaleString()} rows · {fmtDate(active.uploadedAt)}
              {active.coverage && (
                <span className="text-[var(--color-ink-3)]">
                  {" "}· {active.coverage.start}…{active.coverage.end}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-0.5 text-[11px] text-[var(--color-ink-3)]">Not uploaded</div>
          )}
          {active && active.issues.length > 0 && (
            <div className="mt-1 text-[11px] text-[var(--color-warn)]">⚠ {active.issues.join(" ")}</div>
          )}
        </div>

        {active ? (
          <Tag tone={STATUS_TONE[active.status]}>{active.status}</Tag>
        ) : (
          <Tag tone={REQUIREMENT_META[template.requirement].tone === "neutral" ? "neutral" : REQUIREMENT_META[template.requirement].tone}>
            {REQUIREMENT_META[template.requirement].label}
          </Tag>
        )}

        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-1.5">
          <Button onClick={() => input.current?.click()}>
            <IconUpload size={13} /> {active ? "New version" : "Upload"}
          </Button>
          {active && (
            <button
              onClick={() => triggerDownload(active.fileName, active.content)}
              title="Download active CSV"
              className="rounded-md border border-[var(--color-line-strong)] p-1.5 text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
            >
              <IconDownload size={15} />
            </button>
          )}
          <button
            onClick={() => triggerDownload(template.file, templateToCsv(template))}
            title="Download blank template"
            className="rounded-md border border-dashed border-[var(--color-line-strong)] px-2 py-1.5 text-[10px] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)]"
          >
            blank
          </button>
        </div>

        {file && file.versions.length > 1 && (
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="text-[11px] font-medium text-[var(--color-brand-600)] hover:underline"
          >
            {showHistory ? "Hide" : `${file.versions.length} versions`}
          </button>
        )}
      </div>

      {file && showHistory && file.versions.length > 1 && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2">
          {[...file.versions].reverse().map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              isActive={v.id === file.activeVersionId}
              onActivate={() => setActiveFileVersion(project.id, template.id, v.id)}
              onDelete={() => deleteFileVersion(project.id, template.id, v.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function VersionRow({
  version,
  isActive,
  onActivate,
  onDelete,
}: {
  version: FileVersion;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-line)] py-1.5 text-[11.5px] last:border-0">
      <span className="font-medium">v{version.version}</span>
      <span className="text-[var(--color-ink-2)]">{version.fileName}</span>
      <span className="text-[var(--color-ink-3)]">{version.rows.toLocaleString()} rows</span>
      <span className="text-[var(--color-ink-3)]">{fmtDate(version.uploadedAt)}</span>
      <Tag tone={STATUS_TONE[version.status]}>{version.status}</Tag>
      <div className="ml-auto flex items-center gap-2">
        {isActive ? (
          <Tag tone="good">active</Tag>
        ) : (
          <button onClick={onActivate} className="font-medium text-[var(--color-brand-600)] hover:underline">
            Make active
          </button>
        )}
        <button onClick={onDelete} className="font-medium text-[var(--color-bad)] hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}
