import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

function PricingCard({
  title, price, period, description, features, highlighted,
}: {
  title: string; price: string; period: string; description: string; features: string[]; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 flex flex-col ${highlighted ? "border-primary bg-card shadow-glow" : "border-border bg-card"}`}>
      {highlighted && (
        <span className="inline-flex self-start items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary mb-4">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
      <div className="mt-2 mb-1">
        <span className="text-3xl font-extrabold text-card-foreground">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-card-foreground">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/auth"
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          highlighted
            ? "bg-gradient-primary text-primary-foreground hover:opacity-90"
            : "border border-border text-card-foreground hover:bg-accent"
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Pricing
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Plans that scale with your dealership or group.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <PricingCard
            title="Starter"
            price="$299"
            period="/rooftop/mo"
            description="Core recon tracking for a single store"
            features={["Vehicle tracking", "Workflow stages", "Notes & photos", "Basic reporting", "5 users"]}
          />
          <PricingCard
            title="Pro"
            price="$599"
            period="/rooftop/mo"
            description="Full accountability and vendor management"
            features={["Everything in Starter", "Approvals & gates", "Vendor portal", "Parts tracking", "Advanced analytics", "Unlimited users"]}
            highlighted
          />
          <PricingCard
            title="Enterprise"
            price="Custom"
            period=""
            description="Multi-store groups and custom workflows"
            features={["Everything in Pro", "Multi-store dashboards", "Custom workflows", "API integrations", "Dedicated support", "AI recommendations"]}
          />
        </div>
      </div>
    </section>
  );
}
