import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, Button, Tag } from "./ui";
import { IconPlus } from "./icons";

// S&OP decision & action log — turns the review into committed,
// owned, tracked actions. Persisted in Convex per project.

const NEXT: Record<string, "open" | "in_progress" | "done"> = {
  open: "in_progress", in_progress: "done", done: "open",
};
const TONE = { open: "warn", in_progress: "info", done: "good" } as const;
const LABEL = { open: "Open", in_progress: "In progress", done: "Done" } as const;

export default function DecisionsPanel({ projectId }: { projectId: string }) {
  const decisions = useQuery(api.decisions.list, { projectId: projectId as never });
  const create = useMutation(api.decisions.create);
  const setStatus = useMutation(api.decisions.setStatus);
  const remove = useMutation(api.decisions.remove);

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await create({ projectId: projectId as never, title: title.trim(), owner: owner.trim() || "Unassigned", due: due.trim() });
    setTitle(""); setOwner(""); setDue(""); setAdding(false);
  }

  const all = decisions ?? [];
  const open = all.filter((d) => d.status !== "done").length;
  const done = all.filter((d) => d.status === "done").length;
  const completion = all.length ? Math.round((done / all.length) * 100) : 0;

  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="text-[13px] font-semibold">Decisions & actions</span>
        <Tag tone={open ? "warn" : "good"}>{open} open</Tag>
        {all.length > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-2)]">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
              <span className="block h-full rounded-full bg-[var(--color-good-2)]" style={{ width: `${completion}%` }} />
            </span>
            {completion}% complete
          </span>
        )}
        <Button className="ml-auto" onClick={() => setAdding((a) => !a)}><IconPlus size={13} /> Add</Button>
      </div>

      {adding && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 sm:grid-cols-[1fr_140px_120px_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Decision / action…" className={inputCls} autoFocus />
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner" className={inputCls} />
          <input value={due} onChange={(e) => setDue(e.target.value)} placeholder="Due (e.g. Wk 24)" className={inputCls} />
          <Button type="submit" variant="primary">Save</Button>
        </form>
      )}

      <div className="divide-y divide-[var(--color-line)]">
        {decisions === undefined && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">Loading…</div>}
        {decisions && decisions.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No decisions logged yet — capture what leadership commits to.</div>
        )}
        {(decisions ?? []).map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
            <button onClick={() => setStatus({ id: d.id as never, status: NEXT[d.status] })} title="Click to advance status">
              <Tag tone={TONE[d.status]}>{LABEL[d.status]}</Tag>
            </button>
            <span className={`min-w-0 flex-1 truncate ${d.status === "done" ? "text-[var(--color-ink-3)] line-through" : "font-medium"}`}>{d.title}</span>
            <span className="text-[11px] text-[var(--color-ink-2)]">{d.owner}</span>
            {d.due && <span className="text-[11px] text-[var(--color-ink-3)]">{d.due}</span>}
            <button onClick={() => remove({ id: d.id as never })} className="text-[11px] text-[var(--color-bad)] hover:underline">remove</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

const inputCls = "rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]";
