import multiDeviceMockup from "@/assets/multi-device-mockup.png";
import heroDashboard from "@/assets/hero-dashboard.jpg";

export default function ProductShowcase() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
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

        {/* Multi-device mockup */}
        <div className="flex justify-center mb-16">
          <img
            src={multiDeviceMockup}
            alt="ReconPulse software displayed on laptop, tablet, and mobile devices"
            className="max-w-4xl w-full drop-shadow-2xl"
          />
        </div>

        {/* Dashboard screenshot */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
          <img
            src={heroDashboard}
            alt="ReconPulse dashboard showing vehicle reconditioning workflow board"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
