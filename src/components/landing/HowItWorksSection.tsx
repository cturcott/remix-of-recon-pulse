const steps = [
  {
    number: "01",
    title: "Set Up Your Workflow",
    description: "Define your recon stages — Intake, Inspection, Mechanical, Body, Detail, Photos, Frontline — or create your own custom pipeline.",
  },
  {
    number: "02",
    title: "Add Vehicles",
    description: "Scan a VIN, import from CSV, or connect your DMS. Vehicle data auto-populates with year, make, model, and trim.",
  },
  {
    number: "03",
    title: "Track Progress in Real Time",
    description: "Every department updates status as work completes. Managers see the full pipeline on one screen with SLA countdowns.",
  },
  {
    number: "04",
    title: "Approve, Analyze, Improve",
    description: "Approve repair estimates, track costs, identify bottlenecks, and continuously reduce your time-to-line.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            How It Works
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            From lot to frontline in four steps
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px bg-border" />
              )}
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground text-xl font-bold mb-4 shadow-glow">
                  {step.number}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
