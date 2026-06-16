import { useState } from "react";
import { Card, Tag } from "../components/ui";
import {
  MODULES, INDUSTRIES, LAYERS, getModule,
  type DashElement, type IndustryKey, type Layer, type ModuleKey,
} from "../lib/dashboardModel";

// ============================================================
// Dashboard Understanding — the design reference for WHAT goes WHERE.
// Pick a module, then move through the three layers (Core → Industry →
// Specialized) as tabs. The Core tab is the common main view for any
// industry; Industry/Specialized are the deeper, customisable layers.
// ============================================================

export default function DashboardUnderstandingPage() {
  const [moduleKey, setModuleKey] = useState<ModuleKey>("overview");
  const [layer, setLayer] = useState<Layer>("core");
  const [industry, setIndustry] = useState<IndustryKey>("discrete");
  const m = getModule(moduleKey);

  const layerCount = (k: Layer) =>
    k === "core" ? m.core.length : k === "specialized" ? m.specialized.length : m.industry[industry].length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold">Dashboard model</h1>
        <p className="text-[12.5px] text-[var(--color-ink-2)]">
          A reference library of what belongs on each S&OP module, layered from a common core toward industry- and company-specific depth. Browse it to understand the building blocks behind the dashboards.
        </p>
      </div>

      <LayerPhilosophy />

      {/* module selector */}
      <div className="flex flex-wrap gap-2">
        {MODULES.map((mod) => {
          const active = mod.key === moduleKey;
          return (
            <button
              key={mod.key}
              onClick={() => { setModuleKey(mod.key); setLayer("core"); }}
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                active
                  ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-brand-300)]"
              }`}
            >
              <span className="text-[18px]">{mod.emoji}</span>
              <span>
                <span className={`block text-[13px] font-semibold ${active ? "text-[var(--color-brand-700)]" : "text-[var(--color-ink)]"}`}>{mod.label}</span>
                <span className="block text-[10.5px] text-[var(--color-ink-3)]">{mod.step}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        {/* module purpose */}
        <div className="mb-3 border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">{m.emoji}</span>
            <h2 className="text-[15px] font-semibold">{m.label}</h2>
            <Tag tone="neutral">{m.step}</Tag>
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-ink-2)]">{m.purpose}</p>
        </div>

        {/* layer tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {LAYERS.map((l) => {
            const active = l.key === layer;
            return (
              <button
                key={l.key}
                onClick={() => setLayer(l.key)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
                  active ? "border-transparent text-white" : "border-[var(--color-line-strong)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
                }`}
                style={active ? { background: l.color } : undefined}
              >
                <span className="font-semibold">{l.label}</span>
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-[var(--color-surface-3)] text-[var(--color-ink-3)]"}`}>{layerCount(l.key)}</span>
              </button>
            );
          })}
        </div>

        {/* layer intro line */}
        <LayerIntro layer={layer} />

        {/* industry selector — only on the Industry layer */}
        {layer === "industry" && (
          <div className="mb-3 mt-3">
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {INDUSTRIES.map((ind) => {
                const active = ind.key === industry;
                return (
                  <button
                    key={ind.key}
                    onClick={() => setIndustry(ind.key)}
                    className={`rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${
                      active ? "border-[var(--color-accent)] bg-[#EEEDFE] font-medium text-[#3C3489]" : "border-[var(--color-line-strong)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    {ind.label}
                  </button>
                );
              })}
            </div>
            <IndustryNote industryKey={industry} />
          </div>
        )}

        {/* element grid */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {(layer === "core" ? m.core : layer === "specialized" ? m.specialized : m.industry[industry]).map((el) => (
            <ElementCard key={el.name} el={el} layer={layer} />
          ))}
        </div>

        {layer === "industry" && m.industry[industry].length === 0 && (
          <p className="mt-3 text-[12px] text-[var(--color-ink-3)]">No industry-specific additions modelled here yet.</p>
        )}
      </Card>
    </div>
  );
}

function LayerPhilosophy() {
  return (
    <Card>
      <div className="mb-3 text-[13px] font-semibold">The layering idea — common core, then depth on demand</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {LAYERS.map((l, i) => (
          <div key={l.key} className="relative rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ background: l.color }} />
            <div className="flex items-center gap-2 pl-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: l.color }}>{i + 1}</span>
              <span className="text-[12.5px] font-semibold">{l.label}</span>
            </div>
            <p className="mt-1.5 pl-1.5 text-[11.5px] text-[var(--color-ink-2)]">{l.tagline}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-2)]">
        Every module opens on its <strong>Core</strong> tab — the elements common to any S&OP dashboard, so the tool reads the same for every
        portfolio company. The <strong>Industry</strong> tab adds what a manufacturing archetype needs (an automotive plant call-offs; a process plant yield &amp; campaigns).
        The <strong>Specialized</strong> tab holds company-specific and advanced IBP depth, switched on only where the data and maturity justify it.
      </p>
    </Card>
  );
}

function LayerIntro({ layer }: { layer: Layer }) {
  const text =
    layer === "core"
      ? "The common main view — present for every industry, the non-negotiable S&OP backbone."
      : layer === "industry"
      ? "Pick an archetype: these elements light up on top of the core for that kind of business."
      : "Company-specific and advanced (IBP) depth — switched on where data maturity justifies it.";
  return <p className="text-[12px] text-[var(--color-ink-2)]">{text}</p>;
}

function IndustryNote({ industryKey }: { industryKey: IndustryKey }) {
  const ind = INDUSTRIES.find((i) => i.key === industryKey)!;
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[#F7F6FE] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[#3C3489]">{ind.label}</span>
        <Tag tone="accent">{ind.archetype}</Tag>
      </div>
      <p className="mt-1 text-[11.5px] text-[var(--color-ink-2)]">{ind.blurb}</p>
      <p className="mt-1 text-[10.5px] text-[var(--color-ink-3)]">e.g. {ind.examples}</p>
    </div>
  );
}

function ElementCard({ el, layer }: { el: DashElement; layer: Layer }) {
  const accent = LAYERS.find((l) => l.key === layer)!.color;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: accent }} />
          <span className="text-[12.5px] font-semibold">{el.name}</span>
        </div>
        {el.status && <Tag tone={el.status === "live" ? "good" : "neutral"}>{el.status === "live" ? "live" : "planned"}</Tag>}
      </div>
      <p className="mt-1.5 text-[11.5px] text-[var(--color-ink)]">{el.what}</p>
      <p className="mt-1 text-[11px] text-[var(--color-ink-2)]"><span className="font-medium text-[var(--color-ink-3)]">Why here:</span> {el.why}</p>
      {(el.data || el.kpi) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {el.kpi && <Tag tone="info">{el.kpi}</Tag>}
          {el.data && <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-2)]">{el.data}</span>}
        </div>
      )}
    </div>
  );
}
