import reconCommandCenter from "@/assets/recon-command-center.jpg";

export default function ProductShowcase() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            The Solution
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Your recon command center
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One connected platform that brings sales, service, and management together
            with real-time workflow visibility across every device.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
          <img
            src={reconCommandCenter}
            alt="Automotive dealership reconditioning service bay with vehicles being processed through workflow stages"
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
