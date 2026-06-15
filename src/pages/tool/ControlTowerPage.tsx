import { Card, CardTitle, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { IconAlert } from "../../components/icons";

type KpiCard = { label: string; val: string; delta: string; tgt: string; tone: "good" | "warn" | "bad" };

const TIERS: { title: string; cards: KpiCard[] }[] = [
  {
    title: "🎯 Customer service",
    cards: [
      { label: "OTIF — all", val: "100%", delta: "On target", tgt: "100%", tone: "good" },
      { label: "Forecast accuracy", val: "84%", delta: "-1pp vs tgt", tgt: "85%", tone: "warn" },
      { label: "ICP adherence", val: "94–116%", delta: "±5% range", tgt: "95–105%", tone: "warn" },
      { label: "Material rejection", val: "₹36.8 L", delta: "Above threshold", tgt: "₹0", tone: "bad" },
    ],
  },
  {
    title: "📦 Inventory & MPS",
    cards: [
      { label: "Inv days — BWL", val: "19.8 d", delta: "Below target", tgt: "40 d", tone: "good" },
      { label: "Inv days — SBD", val: "35.3 d", delta: "RM elevated", tgt: "40 d", tone: "warn" },
      { label: "Inv days — CNS", val: "54.2 d", delta: "+14d over", tgt: "40 d", tone: "bad" },
      { label: "Obsolescence", val: "₹10.7 Cr", delta: "BWL ₹8.1 Cr", tgt: "Minimise", tone: "warn" },
    ],
  },
];

const BORDER: Record<string, string> = {
  good: "border-l-[var(--color-good-2)]",
  warn: "border-l-[var(--color-warn)]",
  bad: "border-l-[var(--color-bad)]",
};

const ALERTS = [
  { tone: "bad", title: "CNS Inventory 54d — WIP 33.7d", body: "Renault QA issue → supply delay from Bawal. Priority resolution needed." },
  { tone: "warn", title: "SBD RM elevated — 31.8 days", body: "Strategic buffer + SCHD drop (VW/MG). GIT pre-arrivals accelerated." },
  { tone: "warn", title: "Sales behind budget — 3 plants", body: "SBD, BWL, CNS below target. ICP-to-budget gap-close actions open." },
  { tone: "good", title: "Savings ₹155.6 L vs ₹125 L target", body: "BWL + CNS combined savings ahead of plan. Sustain momentum." },
] as const;

const ALERT_BG: Record<string, string> = {
  good: "bg-[#EAF3DE] border-[#B8D9A0]",
  warn: "bg-[#FAEEDA] border-[#E8D4A8]",
  bad: "bg-[#FCEBEB] border-[#E8BCBC]",
};

export default function ControlTowerPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-br from-[var(--color-brand-800)] to-[var(--color-brand-600)] px-5 py-4 text-white">
        <div>
          <div className="text-[15px] font-semibold">⚡ Supply Chain Control Tower</div>
          <div className="text-[11px] text-white/70">SFC India — Sealings · Oct'24 · real-time KPI pulse</div>
        </div>
        <div className="flex gap-4 text-center">
          <div><div className="text-[20px] font-bold">8</div><div className="text-[10px] text-white/70">Green</div></div>
          <div><div className="text-[20px] font-bold text-[#ffd27a]">9</div><div className="text-[10px] text-white/70">Amber</div></div>
          <div><div className="text-[20px] font-bold text-[#ff8b8b]">3</div><div className="text-[10px] text-white/70">Red</div></div>
        </div>
      </div>

      <PageHeader title="Control Tower" />

      {TIERS.map((tier) => (
        <Card key={tier.title}>
          <CardTitle>{tier.title}</CardTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tier.cards.map((c) => (
              <div key={c.label} className={`rounded-lg border border-[var(--color-line)] border-l-[3px] ${BORDER[c.tone]} bg-[var(--color-surface-2)] px-3 py-2.5`}>
                <div className="text-[9.5px] uppercase tracking-wide text-[var(--color-ink-2)]">{c.label}</div>
                <div className="mt-0.5 text-[17px] font-semibold leading-none">{c.val}</div>
                <div className={`mt-1 text-[10px] ${c.tone === "good" ? "text-[var(--color-good-2)]" : c.tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-bad)]"}`}>{c.delta}</div>
                <div className="text-[9px] text-[var(--color-ink-3)]">Target: {c.tgt}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardTitle right={<Tag tone="bad">3 active</Tag>}>
          <span className="flex items-center gap-1.5"><IconAlert size={15} /> Active alerts</span>
        </CardTitle>
        <div className="space-y-2">
          {ALERTS.map((a) => (
            <div key={a.title} className={`flex items-start gap-2.5 rounded-md border px-3 py-2 ${ALERT_BG[a.tone]}`}>
              <span className="mt-0.5 text-[13px]">{a.tone === "bad" ? "🔴" : a.tone === "warn" ? "🟡" : "🟢"}</span>
              <div>
                <div className="text-[12px] font-semibold">{a.title}</div>
                <div className="text-[10.5px] text-[var(--color-ink-2)]">{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 4 / 5">
        Live exception engine: thresholds per KPI, auto-generated alerts from your
        data, and AI-suggested root causes & next actions.
      </PlaceholderNote>
    </div>
  );
}
