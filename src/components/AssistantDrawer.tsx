import { useRef, useState } from "react";
import { IconSparkles, IconSend } from "./icons";

// ============================================================
// Persistent AI assistant — a drawer toggled from a floating
// button, available across every module (the "chat-enabled
// backend" from the team alignment). Phase 5 wires this to Claude
// via Convex actions; for now it returns grounded demo answers.
// ============================================================

type Msg = { role: "user" | "assistant"; text: string };

const CANNED: Record<string, string> = {
  gap: "Biggest demand-supply gap: Profile extrusions — 720k demand vs 540k supply (25% gap, €149k revenue at risk), constrained by Bawal Extrusion-2 capacity. GlassRun is also short due to the EPDM shortage.",
  epdm: "EPDM-12 rubber is short from Wk 23, constraining GlassRun and Profile families — €122k at risk. Options: expedite from the alternate supplier, or pre-build Welt seals to free the line.",
  capacity: "Bawal Extrusion-2 is overloaded at 111% (Nov–Dec). Closing it needs ~3,100 extra minutes — a Saturday shift or re-routing Profile volume to Sahibabad Extrusion-3 (currently 82%).",
  bias: "Forecast bias is -4.8% (systematic over-forecast). Worst SKUs: DE-4421 (-22%) and FR-0912 (+17%). Recalibrate before the next consensus cycle.",
  revenue: "12-month base-case revenue is ~72 mEUR. Revenue at risk this cycle is ~€361k, mostly from the Profile gap and the EPDM shortage.",
};

function answer(q: string): string {
  const k = q.toLowerCase();
  for (const [key, val] of Object.entries(CANNED)) if (k.includes(key)) return val;
  return "In Phase 5 I'll answer this from your live project data (Claude over the Convex tables). Try: \"biggest gap\", \"EPDM shortage\", \"capacity overload\", \"forecast bias\", \"revenue at risk\".";
}

export default function AssistantDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Dec'22 plan loaded — 5 families, ICP ₹35.56 Cr. There's a 25% supply gap on Profile extrusions and an EPDM shortage from Wk 23. Ask me anything.",
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
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[var(--color-brand-700)] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg transition-colors hover:bg-[var(--color-brand-800)]"
        >
          <IconSparkles size={17} /> Ask AI
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[380px] flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <IconSparkles size={17} />
            <span className="text-[13px] font-semibold">S&OP Assistant</span>
            <span className="ml-auto rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-ink-3)]">
              demo
            </span>
            <button
              onClick={() => setOpen(false)}
              className="ml-1 rounded-md px-2 py-0.5 text-[18px] leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)]"
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                  }`}
                >
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
              placeholder="Ask about the gap, capacity, materials…"
              className="flex-1 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]"
            />
            <button
              onClick={send}
              className="flex items-center justify-center rounded-md border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] p-2 text-white hover:bg-[var(--color-brand-700)]"
            >
              <IconSend size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
