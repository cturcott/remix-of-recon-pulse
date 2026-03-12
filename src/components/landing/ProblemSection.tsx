import { AlertTriangle, Clock, DollarSign, Eye } from "lucide-react";

const problems = [
  {
    icon: <Clock className="h-6 w-6" />,
    stat: "8.5 days",
    label: "Average recon cycle time",
    detail: "Without visibility, vehicles sit idle between departments — costing you $40+ per day in holding costs.",
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    stat: "$1,200+",
    label: "Lost per vehicle in delays",
    detail: "Missed handoffs, parts delays, and unclear ownership add up fast across your inventory.",
  },
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    stat: "62%",
    label: "Of dealers lack recon visibility",
    detail: "Most stores rely on whiteboards, spreadsheets, or memory — leading to finger-pointing and lost revenue.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    stat: "0%",
    label: "Accountability without software",
    detail: "If you can't measure it, you can't manage it. No timestamps means no accountability.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="py-20 lg:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            The Problem
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
            What you don't know <em>is</em> hurting you
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every day a vehicle sits in recon costs your dealership money. Without real-time visibility,
            bottlenecks go unnoticed and profits erode.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((p) => (
            <div
              key={p.label}
              className="rounded-xl border border-border bg-background p-6 text-center transition-all hover:border-destructive/30 hover:shadow-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                {p.icon}
              </div>
              <p className="text-2xl font-extrabold text-card-foreground mb-1">{p.stat}</p>
              <p className="text-sm font-medium text-muted-foreground mb-3">{p.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
