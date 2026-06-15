// Gap-closing register — costed options to close a demand-supply gap,
// ranked by cost per recovered unit. Mirrors the Mutares RCCP "Gap
// Closing" sheet: each alternative carries a Volume, Cost, Capital and
// Resource impact + timing, so leadership has a real trade-off to decide
// on rather than just "we can't". Deterministic + data-anchored.

export type Mitigation = {
  option: string;
  recovered: number; // units recovered (volume impact)
  residual: number; // units still short after this option
  cost: number; // operating cost impact (currency)
  costPerUnit: number;
  capital: number; // one-off capital impact (currency)
  resource: string; // resource impact (qualitative)
  timing: string; // lead time to take effect
  note: string;
};

const OPTIONS = [
  // capFrac = one-off capital as a fraction of the recovered volume's value
  { option: "Overtime / Saturday shift", frac: 0.6, rate: 0.15, capFrac: 0, resource: "+1 shift crew", timing: "This month", note: "Fastest; premium labour" },
  { option: "Re-route to spare line", frac: 0.45, rate: 0.08, capFrac: 0, resource: "Spare line + freight", timing: "2–4 weeks", note: "Limited by spare capacity + inter-plant freight" },
  { option: "Pre-build earlier", frac: 0.5, rate: 0.05, capFrac: 0, resource: "Earlier capacity + stock", timing: "1–2 months", note: "Uses earlier capacity; adds holding cost" },
  { option: "Outsource / subcontract", frac: 0.8, rate: 0.22, capFrac: 0, resource: "3rd-party qualification", timing: "1–3 months", note: "High coverage, highest unit cost" },
  { option: "Add capacity (capex)", frac: 1.0, rate: 0.04, capFrac: 0.5, resource: "New tooling / machine", timing: "3–6 months", note: "Permanent fix; needs capital approval" },
];

export function mitigationsFor(gapUnits: number, price: number): Mitigation[] {
  return OPTIONS.map((o) => {
    const recovered = Math.round(gapUnits * o.frac);
    const cost = recovered * price * o.rate;
    return {
      option: o.option,
      recovered,
      residual: Math.max(0, gapUnits - recovered),
      cost,
      costPerUnit: recovered ? cost / recovered : 0,
      capital: recovered * price * o.capFrac,
      resource: o.resource,
      timing: o.timing,
      note: o.note,
    };
  }).sort((a, b) => a.costPerUnit - b.costPerUnit);
}
