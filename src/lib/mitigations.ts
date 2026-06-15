// Costed options to close a demand-supply gap, ranked by cost per
// recovered unit. Deterministic + data-anchored (gap units × price);
// gives leadership a trade-off to decide on rather than just "we can't".

export type Mitigation = {
  option: string;
  recovered: number; // units recovered
  residual: number; // units still short after this option
  cost: number; // currency
  costPerUnit: number;
  note: string;
};

const OPTIONS = [
  { option: "Overtime / Saturday shift", frac: 0.6, rate: 0.15, note: "Fastest; premium labour" },
  { option: "Re-route to spare line", frac: 0.45, rate: 0.08, note: "Limited by spare capacity + inter-plant freight" },
  { option: "Pre-build earlier", frac: 0.5, rate: 0.05, note: "Uses earlier capacity; adds holding cost" },
  { option: "Outsource / subcontract", frac: 0.8, rate: 0.22, note: "High coverage, highest unit cost" },
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
      note: o.note,
    };
  }).sort((a, b) => a.costPerUnit - b.costPerUnit);
}
