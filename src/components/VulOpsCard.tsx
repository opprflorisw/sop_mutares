import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Tag } from "./ui";
import { IconPlus } from "./icons";
import { fmtMoney } from "../lib/projectData";

// VulOps — Vulnerabilities & Opportunities register. The risk/upside
// list that is an output of every S&OP/IBP meeting. Persisted in Convex.

const NEXT: Record<string, "open" | "mitigating" | "closed"> = {
  open: "mitigating", mitigating: "closed", closed: "open",
};
const STATUS_TONE = { open: "warn", mitigating: "info", closed: "good" } as const;
const STATUS_LABEL = { open: "Open", mitigating: "Mitigating", closed: "Closed" } as const;
const LIK_TONE = { high: "bad", medium: "warn", low: "neutral" } as const;

export default function VulOpsCard({ projectId, currency }: { projectId: string; currency: string }) {
  const items = useQuery(api.vulops.list, { projectId: projectId as never });
  const create = useMutation(api.vulops.create);
  const setStatus = useMutation(api.vulops.setStatus);
  const remove = useMutation(api.vulops.remove);

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<"vulnerability" | "opportunity">("vulnerability");
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState(0);
  const [likelihood, setLikelihood] = useState<"low" | "medium" | "high">("medium");
  const [owner, setOwner] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create({ projectId: projectId as never, kind, title: title.trim(), impact, likelihood, owner: owner.trim() || "Unassigned" });
    setTitle(""); setImpact(0); setOwner(""); setAdding(false);
  }

  const all = items ?? [];
  const vuln = all.filter((x) => x.kind === "vulnerability");
  const opp = all.filter((x) => x.kind === "opportunity");
  const netRisk = vuln.filter((x) => x.status !== "closed").reduce((s, x) => s + x.impact, 0);
  const netOpp = opp.filter((x) => x.status !== "closed").reduce((s, x) => s + x.impact, 0);

  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="text-[13px] font-semibold">Vulnerabilities & Opportunities</span>
        <Tag tone="bad">−{fmtMoney(netRisk, currency)} risk</Tag>
        <Tag tone="good">+{fmtMoney(netOpp, currency)} upside</Tag>
        <Button className="ml-auto" onClick={() => setAdding((a) => !a)}><IconPlus size={13} /> Add</Button>
      </div>

      {adding && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:grid-cols-[130px_1fr_110px_100px_130px_auto]">
          <select value={kind} onChange={(e) => setKind(e.target.value as never)} className={inputCls}>
            <option value="vulnerability">Vulnerability</option>
            <option value="opportunity">Opportunity</option>
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the risk / upside…" className={inputCls} autoFocus />
          <input type="number" value={impact} onChange={(e) => setImpact(Number(e.target.value))} placeholder="Impact" className={inputCls} />
          <select value={likelihood} onChange={(e) => setLikelihood(e.target.value as never)} className={inputCls}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner" className={inputCls} />
          <Button type="submit" variant="primary">Save</Button>
        </form>
      )}

      <div className="divide-y divide-[var(--color-line)]">
        {items === undefined && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">Loading…</div>}
        {items && items.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No items logged — capture the risks to the plan and the upside levers leadership should know about.</div>
        )}
        {all.map((x) => (
          <div key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
            <span className="text-[14px]" title={x.kind}>{x.kind === "vulnerability" ? "⚠️" : "💡"}</span>
            <span className={`min-w-0 flex-1 truncate ${x.status === "closed" ? "text-[var(--color-ink-3)] line-through" : "font-medium"}`}>{x.title}</span>
            <Tag tone={LIK_TONE[x.likelihood]}>{x.likelihood}</Tag>
            <span className={`w-20 text-right font-semibold ${x.kind === "vulnerability" ? "text-[var(--color-bad)]" : "text-[var(--color-good-2)]"}`}>
              {x.kind === "vulnerability" ? "−" : "+"}{fmtMoney(x.impact, currency)}
            </span>
            <button onClick={() => setStatus({ id: x.id as never, status: NEXT[x.status] })} title="Click to advance status">
              <Tag tone={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</Tag>
            </button>
            <button onClick={() => remove({ id: x.id as never })} className="text-[11px] text-[var(--color-bad)] hover:underline">remove</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

const inputCls = "rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]";
