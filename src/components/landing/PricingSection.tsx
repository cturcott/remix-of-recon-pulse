import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";

const features = [
  "Customizable workflow stages",
  "Real-time vehicle tracking",
  "Approvals & cost gates",
  "Automated notifications & SLAs",
  "VIN decoding & CSV import",
  "Cost & performance analytics",
  "Vendor management",
  "Multi-store dashboards",
  "Unlimited users",
  "Dedicated onboarding support",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Pricing
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Tailored to your dealership
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every store is different. We'll build a plan that fits your size, workflow, and goals.
          </p>
        </div>

        <div className="max-w-lg mx-auto rounded-xl border border-primary bg-card p-8 shadow-glow text-center">
          <h3 className="text-xl font-bold text-card-foreground mb-2">All-Inclusive Platform</h3>
          <p className="text-muted-foreground text-sm mb-8">
            Full access to every feature — customized pricing based on your rooftop count.
          </p>

          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-left mb-10">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-card-foreground">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow"
          >
            Schedule a Demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
