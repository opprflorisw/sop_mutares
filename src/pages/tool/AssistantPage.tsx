import { useRef, useState } from "react";
import { Card, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { IconSend, IconSparkles } from "../../components/icons";

type Msg = { role: "user" | "assistant"; text: string };

const CANNED: Record<string, string> = {
  cns: "Chennai (CNS) inventory is 54.2 days vs the 40-day target — driven by WIP at 33.7 days. Root cause: a Renault QA issue delaying supply from Bawal. Suggested action: expedite the QA resolution and rebalance WIP.",
  inventory: "India total inventory: RM ₹246.1 Cr, WIP ₹116.0 Cr, FG ₹65.4 Cr. Chennai is over target (54.2 d); Bawal is healthy (19.8 d). Obsolescence is ₹10.7 Cr, mostly Bawal.",
  bias: "Worst-bias SKUs: DE-4421 (−22% over-forecast) and FR-0912 (+17% under-forecast). Both need recalibration before the next consensus cycle.",
  revenue: "18-month base-case revenue is ~72 mEUR. Dec'22 actual was 4.04 mEUR/month from MPS ICP ₹35.56 Cr at ₹88/€.",
  savings: "Savings YTM are ₹155.6 L vs a ₹125 L target — ahead of plan, led by BWL and CNS.",
};

function answer(q: string): string {
  const k = q.toLowerCase();
  for (const [key, val] of Object.entries(CANNED)) if (k.includes(key)) return val;
  return "In Phase 5 I'll answer this from your live project data (RAG over the Convex tables). For now try: \"why is CNS inventory high?\", \"worst bias SKUs\", \"revenue\", \"savings\".";
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Dec'22 plan loaded — total ICP ₹35.56 Cr across 5 plants. Top demand: TML (27%), MSIL (19%), TATA (14%). What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  function send() {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: answer(q) }]);
    setInput("");
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="AI Assistant" subtitle="Ask questions about demand, inventory, freight and the scorecard" />

      <Card pad={false} className="flex h-[520px] flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
          <IconSparkles size={16} />
          <span className="text-[13px] font-semibold">S&OP Assistant</span>
          <span className="ml-auto rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-ink-3)]">
            demo responses
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[78%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 text-[10px] font-medium text-[var(--color-ink-3)]">
                    S&OP Assistant
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-line)] p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about demand, inventory, freight, scorecard…"
            className="flex-1 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]"
          />
          <button
            onClick={send}
            className="flex items-center justify-center rounded-md border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] p-2 text-white hover:bg-[var(--color-brand-700)]"
          >
            <IconSend size={16} />
          </button>
        </div>
      </Card>

      <PlaceholderNote phase="Phase 5">
        Real AI: grounded chat over your project data, natural-language forecast
        edits, auto-generated executive reports, and proactive "areas to
        investigate" — powered by Claude via Convex actions.
      </PlaceholderNote>
    </div>
  );
}
