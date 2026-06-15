import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Tag } from "./ui";
import { IconPlus } from "./icons";
import { fmtMoney, type Family } from "../lib/projectData";

// Governed consensus overrides — adjust a family's baseline forecast
// with a reason code + expiry, logged for audit & forecast value-add.
// Reports the net uplift factor back to the Demand page.

const REASONS = ["Promotion", "New customer / NPI", "Market shift", "Supply risk buffer", "Sales input", "Other"];

export default function ConsensusOverridesCard({
  projectId, families, currency, onFactor,
}: {
  projectId: string;
  families: Family[];
  currency: string;
  onFactor: (factor: number) => void;
}) {
  const overrides = useQuery(api.overrides.list, { projectId: projectId as never });
  const create = useMutation(api.overrides.create);
  const remove = useMutation(api.overrides.remove);

  const [adding, setAdding] = useState(false);
  const [family, setFamily] = useState("");
  const [pct, setPct] = useState(10);
  const [reason, setReason] = useState(REASONS[0]);
  const [expires, setExpires] = useState("");

  const ovById = new Map((overrides ?? []).map((o) => [o.family, o.pct]));
  const baseline = families.reduce((s, f) => s + f.demandValue, 0);
  const adjusted = families.reduce((s, f) => s + f.demandValue * (1 + (ovById.get(f.family) ?? 0) / 100), 0);
  const factor = baseline ? adjusted / baseline : 1;

  useEffect(() => { onFactor(factor); }, [factor, onFactor]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fam = family || families[0]?.family;
    if (!fam) return;
    await create({ projectId: projectId as never, family: fam, pct, reason, expires: expires.trim() });
    setAdding(false); setPct(10); setExpires(""); setFamily("");
  }

  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="text-[13px] font-semibold">Consensus overrides</span>
        <Tag tone={overrides && overrides.length ? "info" : "neutral"}>{overrides?.length ?? 0} active</Tag>
        <span className="text-[11px] text-[var(--color-ink-2)]">
          Baseline {fmtMoney(baseline, currency)} → consensus <strong className="text-[var(--color-ink)]">{fmtMoney(adjusted, currency)}</strong>
          {factor !== 1 && <span className={factor > 1 ? "text-[var(--color-good-2)]" : "text-[var(--color-bad)]"}> ({factor > 1 ? "+" : ""}{((factor - 1) * 100).toFixed(1)}%)</span>}
        </span>
        <Button className="ml-auto" onClick={() => { setFamily(families[0]?.family ?? ""); setAdding((a) => !a); }}>
          <IconPlus size={13} /> Override
        </Button>
      </div>

      {adding && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:grid-cols-[1.3fr_90px_1.2fr_110px_auto]">
          <select value={family} onChange={(e) => setFamily(e.target.value)} className={inputCls}>
            {families.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))} className={`${inputCls} w-full`} />
            <span className="text-[12px] text-[var(--color-ink-3)]">%</span>
          </div>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input value={expires} onChange={(e) => setExpires(e.target.value)} placeholder="Expires" className={inputCls} />
          <Button type="submit" variant="primary">Save</Button>
        </form>
      )}

      <div className="divide-y divide-[var(--color-line)]">
        {overrides && overrides.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No overrides — the plan equals the statistical baseline.</div>
        )}
        {(overrides ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
            <span className={`font-semibold ${o.pct >= 0 ? "text-[var(--color-good-2)]" : "text-[var(--color-bad)]"}`}>{o.pct >= 0 ? "+" : ""}{o.pct}%</span>
            <span className="min-w-0 flex-1 truncate font-medium">{o.family}</span>
            <Tag tone="accent">{o.reason}</Tag>
            {o.expires && <span className="text-[11px] text-[var(--color-ink-3)]">exp. {o.expires}</span>}
            <button onClick={() => remove({ id: o.id as never })} className="text-[11px] text-[var(--color-bad)] hover:underline">remove</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

const inputCls = "rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]";
