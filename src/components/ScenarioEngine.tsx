import { useMemo, useState } from "react";
import { Card, Button, Tag } from "./ui";
import { IconPlus, IconTrash } from "./icons";
import { fmtMoney, type ProjectData } from "../lib/projectData";
import type { Project } from "../lib/projects";

// ============================================================
// G6 — Integrated short-term scenario engine. Adjustable levers across
// demand / supply / capacity propagate through the constrained plan to
// revenue, margin, service and risk. Scenarios are saved (localStorage)
// and compared side by side. Deterministic recompute from ProjectData.
// ============================================================

type Levers = { demandPct: number; orderUnits: number; capacityPct: number; material: number };
const BASE: Levers = { demandPct: 0, orderUnits: 0, capacityPct: 0, material: 100 };

type Outcome = { revenue: number; risk: number; marginPct: number; service: number };

function recompute(d: ProjectData, lv: Levers): Outcome {
  const dem = 1 + lv.demandPct / 100;
  const capF = (1 + lv.capacityPct / 100) * (lv.material / 100);
  let demUnitsTot = 0, metUnits = 0, metValue = 0, risk = 0, cmValue = 0;
  d.families.forEach((f, i) => {
    const demUnits = f.unconstrained * dem + (i === 0 ? lv.orderUnits : 0);
    const supplyUnits = Math.min(demUnits, f.constrained * capF);
    demUnitsTot += demUnits;
    metUnits += supplyUnits;
    metValue += supplyUnits * f.price;
    risk += Math.max(0, demUnits - supplyUnits) * f.price;
    cmValue += supplyUnits * (f.price - f.cost);
  });
  return {
    revenue: metValue,
    risk,
    marginPct: metValue ? +((cmValue / metValue) * 100).toFixed(1) : 0,
    service: demUnitsTot ? +((metUnits / demUnitsTot) * 100).toFixed(1) : 100,
  };
}

type Saved = { name: string; levers: Levers; out: Outcome };

export default function ScenarioEngine({ d, project }: { d: ProjectData; project: Project }) {
  const KEY = `sop_scenarios_${project.id}`;
  const [lv, setLv] = useState<Levers>(BASE);
  const [saved, setSaved] = useState<Saved[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });

  const base = useMemo(() => recompute(d, BASE), [d]);
  const live = useMemo(() => recompute(d, lv), [d, lv]);
  const c = d.currency;

  function persist(next: Saved[]) { setSaved(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  function save() {
    const name = `Scenario ${saved.length + 1}`;
    persist([...saved, { name, levers: lv, out: live }]);
  }
  function remove(i: number) { persist(saved.filter((_, idx) => idx !== i)); }

  const delta = (v: number, b: number) => { const d2 = v - b; const s = d2 >= 0 ? "+" : "−"; return `${s}${fmtMoney(Math.abs(d2), c)}`; };

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[13px] font-semibold">Scenario engine — what-if across demand · supply · capacity</h3>
        <Tag tone="accent">live</Tag>
      </div>

      {/* levers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Lever label="Demand" value={`${lv.demandPct > 0 ? "+" : ""}${lv.demandPct}%`}>
          <input type="range" min={-30} max={30} value={lv.demandPct} onChange={(e) => setLv({ ...lv, demandPct: +e.target.value })} className="w-full accent-[var(--color-brand-600)]" />
        </Lever>
        <Lever label="One-off order (units)" value={lv.orderUnits.toLocaleString()}>
          <input type="range" min={0} max={50000} step={1000} value={lv.orderUnits} onChange={(e) => setLv({ ...lv, orderUnits: +e.target.value })} className="w-full accent-[var(--color-brand-600)]" />
        </Lever>
        <Lever label="Capacity" value={`${lv.capacityPct > 0 ? "+" : ""}${lv.capacityPct}%`}>
          <input type="range" min={-30} max={30} value={lv.capacityPct} onChange={(e) => setLv({ ...lv, capacityPct: +e.target.value })} className="w-full accent-[var(--color-brand-600)]" />
        </Lever>
        <Lever label="Material availability" value={`${lv.material}%`}>
          <input type="range" min={50} max={100} value={lv.material} onChange={(e) => setLv({ ...lv, material: +e.target.value })} className="w-full accent-[var(--color-brand-600)]" />
        </Lever>
      </div>

      {/* live outcome vs base */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Revenue (committed)" value={fmtMoney(live.revenue, c)} sub={delta(live.revenue, base.revenue)} good={live.revenue >= base.revenue} />
        <Metric label="Revenue at risk" value={fmtMoney(live.risk, c)} sub={delta(live.risk, base.risk)} good={live.risk <= base.risk} />
        <Metric label="Margin %" value={`${live.marginPct}%`} sub={`${(live.marginPct - base.marginPct).toFixed(1)} pp`} good={live.marginPct >= base.marginPct} />
        <Metric label="Service %" value={`${live.service}%`} sub={`${(live.service - base.service).toFixed(1)} pp`} good={live.service >= base.service} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button onClick={() => setLv(BASE)}>Reset</Button>
        <Button variant="primary" onClick={save}><IconPlus size={13} /> Save scenario</Button>
      </div>

      {/* compare */}
      {saved.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-line)]">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--color-surface-2)] text-[10.5px] text-[var(--color-ink-2)]">
              <tr><th className="px-2.5 py-1.5 text-left font-medium">Scenario</th><th className="px-2.5 py-1.5 text-left font-medium">Levers</th><th className="px-2.5 py-1.5 text-right font-medium">Revenue</th><th className="px-2.5 py-1.5 text-right font-medium">At risk</th><th className="px-2.5 py-1.5 text-right font-medium">Margin</th><th className="px-2.5 py-1.5 text-right font-medium">Service</th><th className="px-2.5 py-1.5"></th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--color-line)] text-[var(--color-ink-3)]">
                <td className="px-2.5 py-1.5 font-medium">Base plan</td><td className="px-2.5 py-1.5">—</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtMoney(base.revenue, c)}</td><td className="px-2.5 py-1.5 text-right tabular-nums">{fmtMoney(base.risk, c)}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{base.marginPct}%</td><td className="px-2.5 py-1.5 text-right tabular-nums">{base.service}%</td><td></td>
              </tr>
              {saved.map((s, i) => (
                <tr key={i} className="border-t border-[var(--color-line)]">
                  <td className="px-2.5 py-1.5 font-medium">{s.name}</td>
                  <td className="px-2.5 py-1.5 text-[10.5px] text-[var(--color-ink-2)]">D{s.levers.demandPct >= 0 ? "+" : ""}{s.levers.demandPct}% · C{s.levers.capacityPct >= 0 ? "+" : ""}{s.levers.capacityPct}% · M{s.levers.material}%{s.levers.orderUnits ? ` · +${s.levers.orderUnits} u` : ""}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtMoney(s.out.revenue, c)}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtMoney(s.out.risk, c)}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{s.out.marginPct}%</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{s.out.service}%</td>
                  <td className="px-2.5 py-1.5 text-right"><button onClick={() => remove(i)} className="text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"><IconTrash size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Lever({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2.5">
      <div className="mb-1 flex items-center justify-between"><span className="text-[11px] text-[var(--color-ink-2)]">{label}</span><span className="text-[12px] font-semibold tabular-nums">{value}</span></div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] p-2.5">
      <div className="text-[10.5px] text-[var(--color-ink-3)]">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums">{value}</div>
      <div className={`text-[10.5px] font-medium ${good ? "text-[var(--color-good-2)]" : "text-[var(--color-bad)]"}`}>{sub}</div>
    </div>
  );
}
