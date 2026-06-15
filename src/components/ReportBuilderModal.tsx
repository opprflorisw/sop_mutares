import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Tag } from "./ui";
import { IconDownload, IconFile, IconSparkles } from "./icons";
import { triggerDownload } from "../lib/csv";
import { activeVersion } from "../lib/projects";
import type { Project } from "../lib/projects";
import type { ProjectData } from "../lib/projectData";
import { exportSnopOnePager } from "../lib/exportSnop";
import { buildReportHtml, WIDGETS, type ReportConfig, type WidgetKey } from "../lib/report";

const KEY = (id: string) => `sop_report_cfg_${id}`;

function defaultConfig(project: Project): ReportConfig {
  return {
    companyName: project.name,
    logoDataUrl: null,
    confidential: true,
    watermark: "",
    footer: "",
    pageNumbers: true,
    widgets: Object.fromEntries(WIDGETS.map((w) => [w.key, true])) as Record<WidgetKey, boolean>,
  };
}
function loadConfig(project: Project): ReportConfig {
  try {
    const raw = localStorage.getItem(KEY(project.id));
    if (raw) return { ...defaultConfig(project), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultConfig(project);
}

export default function ReportBuilderModal({
  project, data, onClose,
}: {
  project: Project;
  data: ProjectData;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<ReportConfig>(() => loadConfig(project));
  const logoInput = useRef<HTMLInputElement>(null);
  const decisions = useQuery(api.decisions.list, { projectId: project.id as never }) ?? [];

  useEffect(() => {
    localStorage.setItem(KEY(project.id), JSON.stringify(cfg));
  }, [cfg, project.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof ReportConfig>(k: K, v: ReportConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const toggleWidget = (k: WidgetKey) => setCfg((c) => ({ ...c, widgets: { ...c.widgets, [k]: !c.widgets[k] } }));

  function onLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  const html = () => buildReportHtml(project, data, cfg, new Date().toLocaleDateString(), decisions);

  function downloadHtml() {
    triggerDownload(`${project.name.replace(/[^\w]+/g, "_")}_SOP_report.html`, html());
  }
  function openPrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html());
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
  function preview() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html());
    w.document.close();
  }
  function downloadData() {
    for (const f of project.files) {
      const v = activeVersion(f);
      if (v) triggerDownload(v.fileName, v.content);
    }
  }

  const selectedCount = Object.values(cfg.widgets).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <IconFile size={16} />
          <span className="text-[14px] font-semibold">Report builder — S&OP review pack</span>
          <Tag tone="info">{selectedCount} widgets</Tag>
          <button onClick={onClose} className="ml-auto rounded-md px-2 py-1 text-[20px] leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)]">×</button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2">
          {/* widgets */}
          <div className="border-b border-[var(--color-line)] p-4 md:border-b-0 md:border-r">
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink-2)]">Sections to include</div>
            <div className="space-y-1.5">
              {WIDGETS.map((w) => (
                <label key={w.key} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-[var(--color-surface-2)]">
                  <input type="checkbox" checked={cfg.widgets[w.key]} onChange={() => toggleWidget(w.key)} className="accent-[var(--color-brand-600)]" />
                  {w.label}
                </label>
              ))}
            </div>
          </div>

          {/* branding */}
          <div className="p-4">
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink-2)]">Branding & layout</div>
            <Field label="Company name">
              <input value={cfg.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Company logo">
              <div className="flex items-center gap-2">
                {cfg.logoDataUrl ? (
                  <img src={cfg.logoDataUrl} alt="logo" className="h-7 max-w-[120px] rounded border border-[var(--color-line)] bg-white object-contain p-0.5" />
                ) : (
                  <span className="text-[11px] text-[var(--color-ink-3)]">none</span>
                )}
                <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }} />
                <Button onClick={() => logoInput.current?.click()}>Upload</Button>
                {cfg.logoDataUrl && <button onClick={() => set("logoDataUrl", null)} className="text-[11px] text-[var(--color-bad)] hover:underline">remove</button>}
              </div>
            </Field>
            <Field label="Watermark (optional)">
              <input value={cfg.watermark} onChange={(e) => set("watermark", e.target.value)} placeholder="e.g. DRAFT" className={inputCls} />
            </Field>
            <Field label="Footer note (optional)">
              <input value={cfg.footer} onChange={(e) => set("footer", e.target.value)} placeholder="Prepared by…" className={inputCls} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                <input type="checkbox" checked={cfg.confidential} onChange={(e) => set("confidential", e.target.checked)} className="accent-[var(--color-brand-600)]" /> Confidential
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                <input type="checkbox" checked={cfg.pageNumbers} onChange={(e) => set("pageNumbers", e.target.checked)} className="accent-[var(--color-brand-600)]" /> Page footer
              </label>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
          <button onClick={preview} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] hover:bg-[var(--color-surface-2)]">
            <IconSparkles size={14} /> Preview
          </button>
          <span className="flex-1" />
          <button onClick={downloadData} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] hover:bg-[var(--color-surface-2)]">
            <IconDownload size={14} /> Data files
          </button>
          <button onClick={() => exportSnopOnePager(project, data)} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] hover:bg-[var(--color-surface-2)]">
            <IconDownload size={14} /> CSV
          </button>
          <button onClick={downloadHtml} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] hover:bg-[var(--color-surface-2)]">
            <IconDownload size={14} /> Interactive HTML
          </button>
          <Button variant="primary" onClick={openPrint}>
            <IconDownload size={14} /> PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2.5 block">
      <span className="mb-1 block text-[11.5px] font-medium text-[var(--color-ink-2)]">{label}</span>
      {children}
    </label>
  );
}
