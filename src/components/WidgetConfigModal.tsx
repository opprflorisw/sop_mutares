import { useEffect, useMemo, useState } from "react";
import { Button, Tag } from "./ui";
import { IconSparkles, IconCheck } from "./icons";
import { computeProjectData } from "../lib/projectData";
import { unifiedSources, sourceFields, parseSpec, type CustomSpec, type ChartKind, type Agg } from "../lib/customWidget";
import { CustomWidgetView } from "./widgets/registry";
import type { Project } from "../lib/projects";
import type { DashboardPage } from "../lib/dashboards";

// ============================================================
// Widget configuration modal — build / duplicate a custom widget by
// selecting a UNIFIED data source (by type, never an individual file),
// a dimension, a measure and a chart. Optional natural-language prefill.
// Live preview; "Add to dashboard" returns the spec.
// ============================================================

const CHARTS: { value: ChartKind; label: string }[] = [
  { value: "bar", label: "Bar" }, { value: "line", label: "Line / trend" }, { value: "pie", label: "Pie / mix" }, { value: "kpi", label: "Single number" },
];
const AGGS: { value: Agg; label: string }[] = [{ value: "sum", label: "Sum" }, { value: "avg", label: "Average" }, { value: "count", label: "Count" }];

export default function WidgetConfigModal({
  project, area, initial, onClose, onSave,
}: {
  project: Project;
  area: DashboardPage;
  initial?: CustomSpec;
  onClose: () => void;
  onSave: (spec: CustomSpec) => void;
}) {
  const sources = useMemo(() => unifiedSources(project), [project]);
  const d = useMemo(() => computeProjectData(project), [project]);

  const [spec, setSpec] = useState<CustomSpec>(() => initial ?? {
    title: "", source: sources[0]?.id ?? "sales", dimension: "month", measure: "count", agg: "sum", chart: "bar", page: area,
  });
  const [nl, setNl] = useState("");

  const fields = useMemo(() => sourceFields(spec.source), [spec.source]);

  // keep dim/measure valid when source changes
  useEffect(() => {
    setSpec((s) => {
      const dimOk = fields.dims.some((x) => x.value === s.dimension);
      const measOk = fields.measures.some((x) => x.value === s.measure);
      return { ...s, dimension: dimOk ? s.dimension : (fields.dims[0]?.value ?? "month"), measure: measOk ? s.measure : (fields.measures[1]?.value ?? "count") };
    });
  }, [spec.source]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  function applyNl() {
    if (!nl.trim()) return;
    setSpec({ ...parseSpec(nl, project), page: area });
  }
  const set = (patch: Partial<CustomSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const title = spec.title || `${spec.measure} by ${spec.dimension}`;
  const valid = sources.length > 0;

  const sel = "w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]";
  const lbl = "mb-1 block text-[11px] font-medium text-[var(--color-ink-2)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <span className="text-[14px] font-semibold">{initial ? "Configure widget" : "Create a widget"}</span>
          <Tag tone="accent">{area}</Tag>
          <button onClick={onClose} className="ml-auto rounded-md px-2 py-1 text-[20px] leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)]" aria-label="Close">×</button>
        </div>

        {!valid ? (
          <div className="p-6 text-[13px] text-[var(--color-ink-2)]">Upload data first — there are no data sources to build a widget from.</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-auto lg:grid-cols-[minmax(0,340px)_1fr]">
            {/* config */}
            <div className="space-y-3 border-b border-[var(--color-line)] p-4 lg:border-b-0 lg:border-r">
              <div>
                <label className={lbl}>Describe it (optional)</label>
                <div className="flex gap-2">
                  <input value={nl} onChange={(e) => setNl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyNl()} placeholder="e.g. revenue by region" className={sel} />
                  <Button onClick={applyNl}><IconSparkles size={13} /></Button>
                </div>
              </div>
              <div>
                <label className={lbl}>Title</label>
                <input value={spec.title} onChange={(e) => set({ title: e.target.value })} placeholder={title} className={sel} />
              </div>
              <div>
                <label className={lbl}>Data source <span className="text-[var(--color-ink-3)]">(unified — not individual files)</span></label>
                <select value={spec.source} onChange={(e) => set({ source: e.target.value })} className={sel}>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Group by</label>
                  <select value={spec.dimension} onChange={(e) => set({ dimension: e.target.value })} className={sel}>
                    {fields.dims.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Measure</label>
                  <select value={spec.measure} onChange={(e) => set({ measure: e.target.value })} className={sel}>
                    {fields.measures.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Aggregation</label>
                  <select value={spec.agg} onChange={(e) => set({ agg: e.target.value as Agg })} className={sel}>
                    {AGGS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Chart</label>
                  <select value={spec.chart} onChange={(e) => set({ chart: e.target.value as ChartKind })} className={sel}>
                    {CHARTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* live preview */}
            <div className="p-4">
              <div className="mb-2 text-[11px] font-medium text-[var(--color-ink-2)]">Live preview</div>
              <div className="h-[260px] rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2">
                <CustomWidgetView d={d} project={project} config={{ spec: { ...spec, title } }} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave({ ...spec, title })}><IconCheck size={14} /> Add to dashboard</Button>
        </div>
      </div>
    </div>
  );
}
