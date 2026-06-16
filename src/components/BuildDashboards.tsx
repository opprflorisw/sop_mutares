import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import { useProjects, type Project } from "../lib/projects";
import { profileProject } from "../lib/dataProfile";
import {
  readinessFor, resolveIndustryKey, widgetDataSources, WIDGET_CATALOG,
  type CatalogEntry, type MissingReq,
} from "../lib/widgetCatalog";
import { placeFromCatalog } from "../lib/dashboardGenerator";
import { duplicateSpec, type CustomSpec } from "../lib/customWidget";
import { MODULES, type ModuleKey } from "../lib/dashboardModel";
import type { DashboardPage, PlacedWidget } from "../lib/dashboards";
import WidgetConfigModal from "./WidgetConfigModal";
import { Card, CardTitle, Button, Tag } from "./ui";
import {
  IconCheck, IconSpinner, IconPlus, IconAlert, IconUpload, IconArrowRight, IconTrash, IconCopy, IconPencil,
} from "./icons";

const PAGES: DashboardPage[] = ["overview", "demand", "supply", "capacity"];
const pageLabel = (p: ModuleKey) => MODULES.find((m) => m.key === p)?.label ?? p;
const pageIcon = (p: DashboardPage) => (p === "overview" ? "dashboard" : p === "demand" ? "chart" : p === "supply" ? "factory" : "box");

type CustomItem = { id: string; page: DashboardPage; spec: CustomSpec };
type ModalState = { area: DashboardPage; initial?: CustomSpec; editId?: string } | null;

export default function BuildDashboards({ project }: { project: Project }) {
  const { setActiveProject } = useProjects();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createMut = useMutation(api.dashboards.create);
  const removeMut = useMutation(api.dashboards.remove);
  const stored = useQuery(api.dashboards.list, { projectId: project.id as never }) ?? [];

  const profile = useMemo(() => profileProject(project), [project]);
  const industry = resolveIndustryKey(project.industry);

  // start from the recommended ready set; fully deselectable.
  const ready = useMemo(() => WIDGET_CATALOG.filter((e) => readinessFor(e, profile, industry).state === "ready"), [profile, industry]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(ready.filter((e) => e.highlight).map((e) => e.key)));
  const [customs, setCustoms] = useState<CustomItem[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (key: string) => setSelected((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  function widgetsForPage(page: DashboardPage): PlacedWidget[] {
    const entries = WIDGET_CATALOG.filter((e) => e.module === page && selected.has(e.key));
    const kpis = entries.filter((e) => e.widgetId === "stat").map((e) => ({ ...placeFromCatalog(e), w: 2, h: 1 }));
    const panels = entries.filter((e) => e.widgetId !== "stat").map(placeFromCatalog);
    const custom = customs.filter((c) => c.page === page).map((c) => ({ widgetId: "custom", w: 6, h: 3, config: { spec: c.spec } } as PlacedWidget));
    return [...kpis, ...panels, ...custom];
  }
  const totalSelected = PAGES.reduce((s, p) => s + widgetsForPage(p).length, 0);
  const generatedDashboards = stored.filter((s) => /\(generated\)$/.test(s.name));

  // Persist the selection as one starter page per page, then open the tool.
  // (Generation happens implicitly on "Open" — no separate generate step.)
  async function openTool() {
    setBusy(true);
    for (const g of generatedDashboards) await removeMut({ id: g.id as never }); // start clean
    for (const page of PAGES) {
      const widgets = widgetsForPage(page);
      if (!widgets.length) continue;
      await createMut({
        projectId: project.id as never, owner: user?.email ?? "unknown",
        name: `${pageLabel(page)} (generated)`, icon: pageIcon(page),
        description: "Your selected widgets — customise or add pages in the tool.", page, widgets: widgets as never,
      });
    }
    setActiveProject(project.id);
    setBusy(false);
    navigate("/tool/overview");
  }

  function saveCustom(spec: CustomSpec) {
    if (modal?.editId) setCustoms((c) => c.map((x) => (x.id === modal.editId ? { ...x, spec } : x)));
    else setCustoms((c) => [...c, { id: `${spec.page}-${c.length}-${Date.now()}`, page: spec.page ?? "overview", spec }]);
    setModal(null);
  }

  return (
    <div className="space-y-4">
      {/* top action — once you've chosen, open the tool (generation is implicit) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight">Configure your dashboards</h2>
          <p className="text-[11.5px] text-[var(--color-ink-3)]">{totalSelected} widget{totalSelected === 1 ? "" : "s"} selected across pages — only these open in the tool.</p>
        </div>
        <Button variant="primary" onClick={openTool} disabled={busy || totalSelected === 0}>
          {busy ? <IconSpinner size={14} /> : null} Open in S&OP tool <IconArrowRight size={14} />
        </Button>
      </div>

      <Card>
        <CardTitle right={
          <div className="flex items-center gap-2">
            <Button onClick={() => setSelected(new Set())}>Clear all</Button>
            <Button onClick={() => setSelected(new Set(ready.filter((e) => e.highlight).map((e) => e.key)))}>Recommended</Button>
            <Button onClick={() => setSelected(new Set(ready.map((e) => e.key)))}>Select all ready</Button>
          </div>
        }>
          Widgets by page
        </CardTitle>
        <p className="-mt-1 mb-3 text-[12px] text-[var(--color-ink-2)]">
          Per area: tick the widgets you want, <strong>duplicate</strong> one to build a custom variant on your own data, or <strong>create</strong> a new widget. Greyed widgets need more data. Only ticked widgets are generated.
        </p>

        <div className="space-y-5">
          {PAGES.map((page) => (
            <AreaSection
              key={page} page={page} profile={profile} industry={industry}
              selected={selected} onToggle={toggle}
              customs={customs.filter((c) => c.page === page)}
              onCreate={() => setModal({ area: page })}
              onDuplicate={(entry) => setModal({ area: page, initial: duplicateSpec(entry.requires, page, entry.title, project) })}
              onEditCustom={(c) => setModal({ area: page, initial: c.spec, editId: c.id })}
              onRemoveCustom={(id) => setCustoms((cs) => cs.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </Card>

      {modal && (
        <WidgetConfigModal project={project} area={modal.area} initial={modal.initial} onClose={() => setModal(null)} onSave={saveCustom} />
      )}
    </div>
  );
}

function AreaSection({
  page, profile, industry, selected, onToggle, customs, onCreate, onDuplicate, onEditCustom, onRemoveCustom,
}: {
  page: DashboardPage;
  profile: ReturnType<typeof profileProject>;
  industry: ReturnType<typeof resolveIndustryKey>;
  selected: Set<string>;
  onToggle: (key: string) => void;
  customs: CustomItem[];
  onCreate: () => void;
  onDuplicate: (e: CatalogEntry) => void;
  onEditCustom: (c: CustomItem) => void;
  onRemoveCustom: (id: string) => void;
}) {
  const entries = WIDGET_CATALOG.filter((e) => e.module === page);
  const ready: CatalogEntry[] = [];
  const locked: { entry: CatalogEntry; missing: MissingReq[] }[] = [];
  for (const e of entries) {
    const r = readinessFor(e, profile, industry);
    if (r.state === "ready") ready.push(e);
    else if (r.state === "locked") locked.push({ entry: e, missing: r.missing });
  }
  if (!ready.length && !locked.length && !customs.length) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">{pageLabel(page)}</h3>
        <span className="text-[10.5px] text-[var(--color-ink-3)]">AI-generated widgets</span>
        <button onClick={onCreate} className="ml-auto flex items-center gap-1 rounded-md border border-dashed border-[var(--color-brand-300)] px-2 py-1 text-[11px] font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)]">
          <IconPlus size={12} /> Create custom widget
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ready.map((e) => (
          <ReadyCard key={e.key} entry={e} on={selected.has(e.key)} onToggle={() => onToggle(e.key)} onDuplicate={() => onDuplicate(e)} />
        ))}
        {customs.map((c) => (
          <div key={c.id} className="flex flex-col rounded-lg border border-[var(--color-brand-500)] bg-[var(--color-brand-50)] p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"><IconCheck size={11} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">{c.spec.title}<Tag tone="accent">custom</Tag></span>
                <span className="mt-0.5 block text-[10.5px] text-[var(--color-ink-2)]">{c.spec.chart} · {c.spec.measure} by {c.spec.dimension} · {c.spec.source}</span>
              </span>
              <button onClick={() => onEditCustom(c)} title="Edit" className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"><IconPencil size={13} /></button>
              <button onClick={() => onRemoveCustom(c.id)} title="Remove" className="text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"><IconTrash size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {locked.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--color-ink-3)]"><IconAlert size={12} className="text-[var(--color-warn)]" /> Can't build yet — missing data</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map(({ entry, missing }) => (
              <div key={entry.key} className="rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] p-3 opacity-80">
                <div className="text-[12px] font-semibold text-[var(--color-ink-2)]">{entry.title}</div>
                <div className="mt-0.5 text-[10.5px] text-[var(--color-ink-3)]">Uses: {widgetDataSources(entry).join(", ")}</div>
                {missing.map((m, i) => <div key={i} className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[var(--color-warn)]"><IconUpload size={10} /> {m.detail}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadyCard({ entry, on, onToggle, onDuplicate }: { entry: CatalogEntry; on: boolean; onToggle: () => void; onDuplicate: () => void }) {
  return (
    <div className={`flex flex-col rounded-lg border p-3 transition-colors ${on ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]" : "border-[var(--color-line)] bg-[var(--color-surface)]"}`}>
      <div className="flex items-start gap-2">
        <button onClick={onToggle} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white" : "border-[var(--color-line-strong)]"}`}>
          {on && <IconCheck size={11} />}
        </button>
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">{entry.title}{entry.highlight && <Tag tone="accent">recommended</Tag>}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-2)]">{entry.blurb}</span>
          <span className="mt-1 block text-[10px] text-[var(--color-ink-3)]">Uses: {widgetDataSources(entry).join(", ")}</span>
        </button>
        <button onClick={onDuplicate} title="Duplicate & customise on your own data" className="text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)]"><IconCopy size={13} /></button>
      </div>
    </div>
  );
}
