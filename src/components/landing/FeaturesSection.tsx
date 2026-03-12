import {
  Workflow,
  Clock,
  Users,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  Smartphone,
  Bell,
  Wrench,
  MapPin,
  FileText,
  Zap,
} from "lucide-react";

const features = [
  { icon: <Workflow className="h-5 w-5" />, title: "Customizable Workflow Stages", description: "Define your own recon pipeline — from intake to frontline — to match your exact process." },
  { icon: <Clock className="h-5 w-5" />, title: "Time-to-Line Tracking", description: "See exactly how many days each vehicle spends in every stage. Set SLAs and flag overdue units." },
  { icon: <Users className="h-5 w-5" />, title: "Ownership & Accountability", description: "Every step has an owner, a timestamp, and a deadline. No more finger-pointing." },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Approvals & Cost Gates", description: "Built-in estimate approvals with dollar thresholds, denial reasons, and audit trails." },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Cost & Performance Analytics", description: "See recon investment by vehicle, category, vendor, and department at a glance." },
  { icon: <AlertTriangle className="h-5 w-5" />, title: "Bottleneck Detection", description: "Instantly surface blocked vehicles, parts delays, and aging units before they cost you." },
  { icon: <Bell className="h-5 w-5" />, title: "Automated Notifications", description: "Stage-entry alerts, SLA reminders, and escalation emails keep your team moving." },
  { icon: <Wrench className="h-5 w-5" />, title: "Vendor Management", description: "Track third-party work, costs, and turnaround times alongside internal departments." },
  { icon: <Smartphone className="h-5 w-5" />, title: "Mobile-First Design", description: "Technicians and managers can update status, add notes, and approve from any device." },
  { icon: <MapPin className="h-5 w-5" />, title: "Vehicle Locator", description: "Know the lot location of every vehicle in your recon pipeline instantly." },
  { icon: <FileText className="h-5 w-5" />, title: "VIN Decoding & History", description: "Auto-populate year, make, model, and trim from the VIN. Full decode logs included." },
  { icon: <Zap className="h-5 w-5" />, title: "CSV & DMS Import", description: "Bulk import vehicles from your DMS or spreadsheet with smart field mapping." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Features
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
            Everything your recon team needs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built by people who understand dealership reconditioning — not just software.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-card-foreground mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
