import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui";
import {
  IconFile, IconDashboard, IconChart, IconFactory, IconBox,
  IconBolt, IconPlus, IconSave, IconTrash, IconX, IconGear, IconCopy, IconSparkles,
} from "../../components/icons";
import { NoData } from "./OverviewPage";
import { useProjectData } from "../../lib/projectData";
import { useProjects } from "../../lib/projects";
import { useAuth } from "../../lib/auth";
import { profileProject } from "../../lib/dataProfile";
import { WIDGET_CATALOG, readinessFor, resolveIndustryKey } from "../../lib/widgetCatalog";
import { placeFromCatalog } from "../../lib/dashboardGenerator";
import type { Layout } from "react-grid-layout";
import DashboardGrid from "../../components/DashboardGrid";
import ReportBuilderModal from "../../components/ReportBuilderModal";
import { PREDEFINED_DASHBOARDS, resolveDashboard, WIDGETS, getWidget } from "../../components/widgets/registry";
import type { DashboardDef, DashboardPage, PlacedWidget } from "../../lib/dashboards";
import type { ProjectData } from "../../lib/projectData";

const ICONS: Record<string, typeof IconDashboard> = {
  dashboard: IconDashboard, chart: IconChart, factory: IconFactory, box: IconBox, bolt: IconBolt, file: IconFile,
};
const KEY = (pid: string, page: DashboardPage) => `sop_dashboard_${pid}_${page}`;

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
  ...WIDGETS.filter((w) => w.id !== "stat" && w.id !== "custom").map((w) => ({ label: w.title, widgetId: w.id })),
];

type HostDash = DashboardDef & { _stored?: boolean };
type Draft = { id?: string; name: string; icon: string; description: string; widgets: PlacedWidget[] };

// ---- page templates (named) — built-in presets + user-saved (localStorage) ----
type PageTemplate = { id: string; name: string; page: DashboardPage; widgets: PlacedWidget[] };
const TKEY = "sop_page_templates_v1";
function userTemplates(page: DashboardPage): PageTemplate[] {
  try { return (JSON.parse(localStorage.getItem(TKEY) || "[]") as PageTemplate[]).filter((t) => t.page === page); } catch { return []; }
}
function saveUserTemplate(t: PageTemplate) {
  let all: PageTemplate[] = [];
  try { all = JSON.parse(localStorage.getItem(TKEY) || "[]"); } catch { /* ignore */ }
  localStorage.setItem(TKEY, JSON.stringify([...all, t]));
}
// Keep only widgets whose data is present (the "AI fills the available required widgets").
function availableWidgets(widgets: PlacedWidget[], d: ProjectData): PlacedWidget[] {
  return widgets.filter((w) => { const def = getWidget(w.widgetId); return def && (!def.available || def.available(d)); });
}

export default function DashboardsPage({ page = "overview" }: { page?: DashboardPage }) {
  const d = useProjectData();
  const { activeProject } = useProjects();
  const { user } = useAuth();

  const stored = useQuery(api.dashboards.list, activeProject ? { projectId: activeProject.id as never } : "skip") ?? [];
  const createMut = useMutation(api.dashboards.create);
  const updateMut = useMutation(api.dashboards.update);
  const removeMut = useMutation(api.dashboards.remove);

  const [selectedId, setSelectedId] = useState<string>(() => (activeProject && localStorage.getItem(KEY(activeProject.id, page))) || "");
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const editing = draft !== null;

  // Only the user's own dashboards for this page — no hardcoded presets.
  const dashboards: HostDash[] = useMemo(() => {
    return stored
      .filter((s) => (s.page ?? "overview") === page)
      .map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? "dashboard", description: s.description, page, widgets: s.widgets as PlacedWidget[], _stored: true }));
  }, [stored, page]);

  const current = useMemo(() => dashboards.find((x) => x.id === selectedId) ?? dashboards[0], [dashboards, selectedId]);

  useEffect(() => {
    if (activeProject && !editing && current) localStorage.setItem(KEY(activeProject.id, page), current.id);
  }, [current, activeProject, editing, page]);

  if (!d.hasData || !activeProject) return <NoData />;

  // Templates offered by the + Add page flow.
  const profile = profileProject(activeProject);
  const industry = resolveIndustryKey(activeProject.industry);
  const recommended: PlacedWidget[] = WIDGET_CATALOG
    .filter((e) => e.module === page && e.highlight && readinessFor(e, profile, industry).state === "ready")
    .map((e) => (e.widgetId === "stat" ? { ...placeFromCatalog(e), w: 2, h: 1 } : placeFromCatalog(e)));
  const builtinTemplates: PageTemplate[] = PREDEFINED_DASHBOARDS
    .filter((x) => (x.page ?? "overview") === page)
    .map((p) => ({ id: p.id, name: p.name, page, widgets: availableWidgets(resolveDashboard(p, d), d) }));
  const templates: { kind: string; items: PageTemplate[] }[] = [
    ...(recommended.length ? [{ kind: "Recommended", items: [{ id: "rec", name: "Recommended (from your data)", page, widgets: recommended }] }] : []),
    { kind: "Built-in templates", items: builtinTemplates },
    ...(userTemplates(page).length ? [{ kind: "Your templates", items: userTemplates(page) }] : []),
  ];

  const widgets = editing ? draft!.widgets : current ? current.widgets : [];

  function startEdit() {
    if (!current) return;
    setDraft({ id: current.id, name: current.name, icon: current.icon ?? "dashboard", description: current.description ?? "", widgets: current.widgets });
  }
  function addWidget(e: PaletteEntry) {
    const def = getWidget(e.widgetId); if (!def) return;
    setDraft((dr) => dr && { ...dr, widgets: [...dr.widgets, { widgetId: e.widgetId, w: def.defaultSize.w, h: def.defaultSize.h, config: e.config }] });
  }
  function removeWidget(i: number) { setDraft((dr) => dr && { ...dr, widgets: dr.widgets.filter((_, idx) => idx !== i) }); }
  function applyLayout(layout: Layout[]) {
    setDraft((dr) => {
      if (!dr) return dr;
      let changed = false;
      const next = dr.widgets.map((wgt, idx) => {
        const l = layout.find((x) => Number(x.i) === idx);
        if (!l) return wgt;
        if (wgt.x !== l.x || wgt.y !== l.y || wgt.w !== l.w || wgt.h !== l.h) { changed = true; return { ...wgt, x: l.x, y: l.y, w: l.w, h: l.h }; }
        return wgt;
      });
      return changed ? { ...dr, widgets: next } : dr;
    });
  }
  async function save() {
    if (!draft) return;
    const payload = { name: draft.name.trim() || "Untitled", icon: draft.icon, description: draft.description.trim(), page, widgets: draft.widgets };
    if (draft.id) { await updateMut({ id: draft.id as never, ...payload }); setSelectedId(draft.id); }
    else { const id = await createMut({ projectId: activeProject!.id as never, owner: user?.email ?? "unknown", ...payload }); setSelectedId(id as unknown as string); }
    setDraft(null);
  }
  async function addPage(name: string, w: PlacedWidget[], icon = "dashboard") {
    const id = await createMut({ projectId: activeProject!.id as never, owner: user?.email ?? "unknown", name, icon, description: "", page, widgets: w as never });
    setSelectedId(id as unknown as string);
  }
  function saveAsTemplate() {
    if (!draft) return;
    const name = window.prompt("Template name", draft.name.trim() || "My template");
    if (!name) return;
    saveUserTemplate({ id: `ut_${name}`, name, page, widgets: draft.widgets });
  }
  async function del() {
    if (!draft?.id) return;
    await removeMut({ id: draft.id as never });
    setDraft(null);
    setSelectedId("");
  }

  return (
    <div className="space-y-4">
      <div className="-mx-4 -mt-4 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 shadow-xs lg:-mx-6 lg:-mt-5 lg:px-6 lg:py-3">
        {editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={draft!.name}
              onChange={(e) => setDraft((dr) => dr && { ...dr, name: e.target.value })}
              className="w-[280px] max-w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[15px] font-semibold outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
              placeholder="Page name"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <AddWidgetMenu onAdd={addWidget} />
              <Button onClick={saveAsTemplate}><IconCopy size={14} /> Save as template</Button>
              {draft!.id && <Button variant="ghost" onClick={del}><IconTrash size={14} /> Delete</Button>}
              <Button variant="primary" onClick={save}><IconSave size={14} /> Save</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}><IconX size={14} /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <DashboardTabs dashboards={dashboards} currentId={current?.id ?? ""} onSelect={setSelectedId} onCustomise={startEdit} templates={templates} onAddPage={addPage} />
            {current && <Button variant="primary" className="shrink-0" onClick={() => setReportOpen(true)}><IconFile size={14} /> Build report</Button>}
          </div>
        )}
      </div>

      {!editing && current?.description && <p className="-mt-1 text-[12px] text-[var(--color-ink-2)]">{current.description}</p>}

      {editing && (
        <div className="rounded-lg border border-dashed border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-3.5 py-2 text-[12px] text-[var(--color-brand-700)]">
          Editing — drag the ⠿ handle to move, a corner to resize, add widgets from the menu, remove with ×. Save as template to reuse this layout on other pages/projects.
        </div>
      )}

      {!current && !editing ? (
        <EmptyPage page={page} templates={templates} onAddPage={addPage} />
      ) : widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line-strong)] py-16 text-center text-[13px] text-[var(--color-ink-3)]">
          Empty page — Customise to add widgets.
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

// + Add page — blank or a named template (AI-filled with available widgets).
function AddPageMenu({
  templates, onAddPage,
}: {
  templates: { kind: string; items: PageTemplate[] }[];
  onAddPage: (name: string, widgets: PlacedWidget[], icon?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const pick = (name: string, widgets: PlacedWidget[]) => { setOpen(false); onAddPage(name, widgets); };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Add a page" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--color-line-strong)] text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]">
        <IconPlus size={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-72 overflow-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-xl">
          <button onClick={() => { const n = window.prompt("Page name", "New page"); if (n) pick(n, []); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium hover:bg-[var(--color-surface-2)]">
            <IconPlus size={14} /> Blank page
          </button>
          {templates.map((grp) => (
            <div key={grp.kind}>
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">{grp.kind}</div>
              {grp.items.map((t) => (
                <button key={t.id} onClick={() => pick(t.name, t.widgets)} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]">
                  <span className="flex items-center gap-1.5">{grp.kind === "Recommended" && <IconSparkles size={12} className="text-[var(--color-brand-600)]" />}{t.name}</span>
                  <span className="text-[10px] text-[var(--color-ink-3)]">{t.widgets.length} widget{t.widgets.length === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyPage({ page, templates, onAddPage }: { page: DashboardPage; templates: { kind: string; items: PageTemplate[] }[]; onAddPage: (name: string, widgets: PlacedWidget[]) => void }) {
  const rec = templates.find((g) => g.kind === "Recommended")?.items[0];
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-line-strong)] py-14 text-center">
      <div className="text-[14px] font-semibold text-[var(--color-ink)]">No pages yet on {page}</div>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-[var(--color-ink-2)]">
        Start clean. Add a blank page and build it yourself, or start from a template — the template fills in the widgets your data supports.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {rec && <Button variant="primary" onClick={() => onAddPage(rec.name, rec.widgets)}><IconSparkles size={14} /> Start with recommended</Button>}
        <Button onClick={() => onAddPage("New page", [])}><IconPlus size={14} /> Blank page</Button>
      </div>
    </div>
  );
}

function DashboardTabs({
  dashboards, currentId, onSelect, onCustomise, templates, onAddPage,
}: {
  dashboards: HostDash[];
  currentId: string;
  onSelect: (id: string) => void;
  onCustomise: () => void;
  templates: { kind: string; items: PageTemplate[] }[];
  onAddPage: (name: string, widgets: PlacedWidget[], icon?: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {dashboards.length > 0 && (
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-1">
          {dashboards.map((dash) => {
            const Icon = ICONS[dash.icon ?? "dashboard"] ?? IconDashboard;
            const active = dash.id === currentId;
            return (
              <div key={dash.id} className={`flex shrink-0 items-center rounded-md transition-colors ${active ? "bg-[var(--color-surface)] shadow-[0_0_0_0.5px_var(--color-line-strong)]" : "hover:bg-[var(--color-surface)]"}`}>
                <button onClick={() => onSelect(dash.id)} title={dash.description} className={`flex items-center gap-1.5 py-1.5 pl-2.5 text-[12.5px] ${active ? "pr-1 font-medium text-[var(--color-ink)]" : "pr-2.5 text-[var(--color-ink-2)]"}`}>
                  <Icon size={15} className={active ? "text-[var(--color-brand-700)]" : "text-[var(--color-ink-3)]"} />
                  <span className="whitespace-nowrap">{dash.name}</span>
                </button>
                {active && (
                  <button onClick={onCustomise} title="Customise this page" className="mr-1 flex h-6 w-6 items-center justify-center rounded text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]">
                    <IconGear size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <AddPageMenu templates={templates} onAddPage={onAddPage} />
    </div>
  );
}
