import { Link } from "react-router-dom";
import { Car, BarChart3, Zap, Shield, ArrowRight, CheckCircle, Clock, Users, TrendingDown } from "lucide-react";

const features = [
  { icon: <Zap className="h-5 w-5" />, title: "Real-Time Tracking", description: "Know exactly where every vehicle sits in your recon pipeline, live." },
  { icon: <Clock className="h-5 w-5" />, title: "Time-to-Line Analytics", description: "Track and reduce the days between acquisition and frontline-ready status." },
  { icon: <Users className="h-5 w-5" />, title: "Ownership & Accountability", description: "Every step has an owner, a timestamp, and a deadline. No more finger-pointing." },
  { icon: <Shield className="h-5 w-5" />, title: "Approvals & Gates", description: "Built-in estimate approvals with dollar thresholds and notifications." },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Cost Visibility", description: "See recon investment by vehicle, category, vendor, and department." },
  { icon: <TrendingDown className="h-5 w-5" />, title: "Bottleneck Detection", description: "Instantly surface blocked vehicles, parts delays, and aging units." },
];

const stats = [
  { value: "40%", label: "Faster time-to-line" },
  { value: "$320", label: "Avg holding cost saved" },
  { value: "2.4x", label: "More throughput" },
  { value: "100%", label: "Recon visibility" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Car className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Recon<span className="text-gradient">Pulse</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#metrics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Results</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <Link to="/dashboard" className="inline-flex items-center rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(173 80% 40% / 0.06) 0%, transparent 60%)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <span className="status-dot bg-primary animate-pulse" />
              Now in Beta — Built for Dealerships
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Your Recon
              <br />
              <span className="text-gradient">Command Center</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
              Track every used vehicle from acquisition to frontline. Eliminate bottlenecks, reduce holding costs, and get cars to the lot faster.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/command-center" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-card-foreground transition-all hover:bg-accent">
                See Demo Board
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="metrics" className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-extrabold text-gradient mb-1">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything your recon team needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One live system for status updates, approvals, delays, costs, ownership, and bottleneck visibility.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-card-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Plans that scale with your dealership or group.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <PricingCard title="Starter" price="$299" period="/rooftop/mo" description="Core recon tracking for a single store" features={["Vehicle tracking", "Workflow stages", "Notes & photos", "Basic reporting", "5 users"]} />
            <PricingCard title="Pro" price="$599" period="/rooftop/mo" description="Full accountability and vendor management" features={["Everything in Starter", "Approvals & gates", "Vendor portal", "Parts tracking", "Advanced analytics", "Unlimited users"]} highlighted />
            <PricingCard title="Enterprise" price="Custom" period="" description="Multi-store groups and custom workflows" features={["Everything in Pro", "Multi-store dashboards", "Custom workflows", "API integrations", "Dedicated support", "AI recommendations"]} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ready to accelerate your recon?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join dealerships that are cutting days off their time-to-line and thousands off holding costs.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow">
            Start Your Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-primary">
              <Car className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">ReconPulse</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 ReconPulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

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
        to="/dashboard"
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
