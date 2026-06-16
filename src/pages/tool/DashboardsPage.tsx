import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui";
import {
  IconFile, IconDashboard, IconChart, IconFactory, IconBox,
  IconBolt, IconPlus, IconSave, IconTrash, IconX, IconGear,
} from "../../components/icons";
import { NoData } from "./OverviewPage";
import { useProjectData } from "../../lib/projectData";
import { useProjects } from "../../lib/projects";
import { useAuth } from "../../lib/auth";
import type { Layout } from "react-grid-layout";
import DashboardGrid from "../../components/DashboardGrid";
import ReportBuilderModal from "../../components/ReportBuilderModal";
import { PREDEFINED_DASHBOARDS, resolveDashboard, WIDGETS, getWidget } from "../../components/widgets/registry";
import type { DashboardDef, PlacedWidget } from "../../lib/dashboards";

const ICONS: Record<string, typeof IconDashboard> = {
  dashboard: IconDashboard, chart: IconChart, factory: IconFactory, box: IconBox, bolt: IconBolt, file: IconFile,
};
const KEY = (pid: string) => `sop_dashboard_${pid}`;

// Add-widget palette — stat KPIs expand into presets; other widgets are single entries.
const STAT_PRESETS: { label: string; metric: string }[] = [
  { label: "KPI · Revenue", metric: "revenue" }, { label: "KPI · Contribution margin", metric: "cm" },
  { label: "KPI · Forecast accuracy", metric: "accuracy" }, { label: "KPI · Forecast bias", metric: "bias" },
  { label: "KPI · Inventory days", metric: "invDays" }, { label: "KPI · Inventory turns", metric: "invTurns" },
  { label: "KPI · Capacity util.", metric: "capacity" }, { label: "KPI · Util. vs planned", metric: "plannedCapacity" },
  { label: "KPI · Revenue at risk", metric: "revenueAtRisk" }, { label: "KPI · SLOB value", metric: "slob" },
  { label: "KPI · Overloaded lines", metric: "overloaded" },
];
type PaletteEntry = { label: string; widgetId: string; config?: Record<string, unknown> };
const PALETTE: PaletteEntry[] = [
  ...STAT_PRESETS.map((s) => ({ label: s.label, widgetId: "stat", config: { metric: s.metric } })),
  ...WIDGETS.filter((w) => w.id !== "stat").map((w) => ({ label: w.title, widgetId: w.id })),
];

type Draft = { id?: string; name: string; icon: string; description: string; widgets: PlacedWidget[] };

export default function DashboardsPage() {
  const d = useProjectData();
  const { activeProject } = useProjects();
  const { user } = useAuth();

  const stored = useQuery(api.dashboards.list, activeProject ? { projectId: activeProject.id as never } : "skip") ?? [];
  const createMut = useMutation(api.dashboards.create);
  const updateMut = useMutation(api.dashboards.update);
  const removeMut = useMutation(api.dashboards.remove);

  const [selectedId, setSelectedId] = useState<string>(() =>
    (activeProject && localStorage.getItem(KEY(activeProject.id))) || "exec"
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const editing = draft !== null;

  const dashboards: DashboardDef[] = useMemo(() => [
    ...PREDEFINED_DASHBOARDS,
    ...stored.map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? "dashboard", description: s.description, widgets: s.widgets as PlacedWidget[] })),
  ], [stored]);

  const current = useMemo(() => dashboards.find((x) => x.id === selectedId) ?? dashboards[0], [dashboards, selectedId]);

  useEffect(() => {
    if (activeProject && !editing) localStorage.setItem(KEY(activeProject.id), selectedId);
  }, [selectedId, activeProject, editing]);

  if (!d.hasData || !activeProject) return <NoData />;

  const widgets = editing ? draft!.widgets : resolveDashboard(current, d);

  function startEdit() {
    if (current.system || current.dynamic) {
      setDraft({ name: `${current.name} (copy)`, icon: current.icon ?? "dashboard", description: current.description ?? "", widgets: resolveDashboard(current, d) });
    } else {
      setDraft({ id: current.id, name: current.name, icon: current.icon ?? "dashboard", description: current.description ?? "", widgets: current.widgets });
    }
  }
  function addWidget(e: PaletteEntry) {
    const def = getWidget(e.widgetId); if (!def) return;
    setDraft((dr) => dr && { ...dr, widgets: [...dr.widgets, { widgetId: e.widgetId, w: def.defaultSize.w, h: def.defaultSize.h, config: e.config }] });
  }
  function removeWidget(i: number) {
    setDraft((dr) => dr && { ...dr, widgets: dr.widgets.filter((_, idx) => idx !== i) });
  }
  function applyLayout(layout: Layout[]) {
    setDraft((dr) => {
      if (!dr) return dr;
      let changed = false;
      const next = dr.widgets.map((wgt, idx) => {
        const l = layout.find((x) => Number(x.i) === idx);
        if (!l) return wgt;
        if (wgt.x !== l.x || wgt.y !== l.y || wgt.w !== l.w || wgt.h !== l.h) {
          changed = true;
          return { ...wgt, x: l.x, y: l.y, w: l.w, h: l.h };
        }
        return wgt;
      });
      return changed ? { ...dr, widgets: next } : dr;
    });
  }
  async function save() {
    if (!draft) return;
    const payload = { name: draft.name.trim() || "Untitled", icon: draft.icon, description: draft.description.trim(), widgets: draft.widgets };
    if (draft.id) {
      await updateMut({ id: draft.id as never, ...payload });
      setSelectedId(draft.id);
    } else {
      const id = await createMut({ projectId: activeProject!.id as never, owner: user?.email ?? "unknown", ...payload });
      setSelectedId(id as unknown as string);
    }
    setDraft(null);
  }
  function startNew() {
    setDraft({ name: "New dashboard", icon: "dashboard", description: "", widgets: [] });
  }
  async function del() {
    if (!draft?.id) return;
    await removeMut({ id: draft.id as never });
    setDraft(null);
    setSelectedId("exec");
  }

  return (
    <div className="space-y-4">
      {editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={draft!.name}
            onChange={(e) => setDraft((dr) => dr && { ...dr, name: e.target.value })}
            className="w-[280px] max-w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[16px] font-semibold outline-none focus:border-[var(--color-brand-500)]"
            placeholder="Dashboard name"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <AddWidgetMenu onAdd={addWidget} />
            {draft!.id && <Button variant="ghost" onClick={del}><IconTrash size={14} /> Delete</Button>}
            <Button variant="primary" onClick={save}><IconSave size={14} /> {draft!.id ? "Save" : "Save as new"}</Button>
            <Button onClick={() => setDraft(null)}><IconX size={14} /> Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <DashboardTabs dashboards={dashboards} currentId={current.id} onSelect={setSelectedId} onCustomise={startEdit} onNew={startNew} />
          <Button variant="primary" className="shrink-0" onClick={() => setReportOpen(true)}><IconFile size={14} /> Build report</Button>
        </div>
      )}

      {!editing && current.description && (
        <p className="-mt-1 text-[12px] text-[var(--color-ink-2)]">{current.description}</p>
      )}

      {editing && (
        <div className="rounded-lg border border-dashed border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-3.5 py-2 text-[12px] text-[var(--color-brand-700)]">
          Editing — drag the ⠿ handle to move, drag a corner to resize, add widgets from the menu, remove with ×. Saving {draft!.id ? "updates this dashboard." : "creates a new dashboard for this project."}
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line-strong)] py-16 text-center text-[13px] text-[var(--color-ink-3)]">
          {current.dynamic ? "No exceptions — the plan is balanced." : "Empty dashboard — add widgets to get started."}
        </div>
      ) : (
        <DashboardGrid widgets={widgets} d={d} project={activeProject} editMode={editing} onRemove={removeWidget} onLayoutChange={applyLayout} />
      )}

      {reportOpen && <ReportBuilderModal project={activeProject} data={d} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

function AddWidgetMenu({ onAdd }: { onAdd: (e: PaletteEntry) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button onClick={() => setOpen((o) => !o)}><IconPlus size={14} /> Add widget</Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 max-h-[60vh] w-64 overflow-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-xl">
          {PALETTE.map((e, i) => (
            <button key={i} onClick={() => { onAdd(e); setOpen(false); }} className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]">{e.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardTabs({
  dashboards, currentId, onSelect, onCustomise, onNew,
}: {
  dashboards: DashboardDef[];
  currentId: string;
  onSelect: (id: string) => void;
  onCustomise: () => void;
  onNew: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-1">
        {dashboards.map((dash) => {
          const Icon = ICONS[dash.icon ?? "dashboard"] ?? IconDashboard;
          const active = dash.id === currentId;
          return (
            <div
              key={dash.id}
              className={`flex shrink-0 items-center rounded-md transition-colors ${active ? "bg-[var(--color-surface)] shadow-[0_0_0_0.5px_var(--color-line-strong)]" : "hover:bg-[var(--color-surface)]"}`}
            >
              <button
                onClick={() => onSelect(dash.id)}
                title={dash.description}
                className={`flex items-center gap-1.5 py-1.5 pl-2.5 text-[12.5px] ${active ? "pr-1 font-medium text-[var(--color-ink)]" : "pr-2.5 text-[var(--color-ink-2)]"}`}
              >
                <Icon size={15} className={active ? "text-[var(--color-brand-700)]" : "text-[var(--color-ink-3)]"} />
                <span className="whitespace-nowrap">{dash.name}</span>
                {dash.dynamic && <span className="rounded bg-[#EEEDFE] px-1 text-[9px] font-semibold leading-[1.4] text-[#3C3489]">AUTO</span>}
              </button>
              {active && (
                <button
                  onClick={onCustomise}
                  title="Customise this dashboard"
                  className="mr-1 flex h-6 w-6 items-center justify-center rounded text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                >
                  <IconGear size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={onNew}
        title="New dashboard"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--color-line-strong)] text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
