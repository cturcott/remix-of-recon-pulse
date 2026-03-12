import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,8%)] to-[hsl(220,25%,14%)]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: "hsl(0, 0%, 100%)" }}>
          Ready to take control of your recon?
        </h2>
        <p className="mb-10 max-w-xl mx-auto" style={{ color: "hsl(220, 10%, 70%)" }}>
          Join dealerships that are cutting days off their time-to-line and saving thousands in holding costs every month.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow"
          >
            Schedule a Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="tel:+18005551234"
            className="inline-flex items-center gap-2 rounded-lg border px-8 py-3.5 text-sm font-semibold transition-all hover:bg-[hsl(0,0%,100%)/0.05]"
            style={{ borderColor: "hsl(0, 0%, 100%, 0.2)", color: "hsl(0, 0%, 100%)" }}
          >
            Call Sales: (800) 555-1234
          </a>
        </div>
      </div>
    </section>
  );
}
