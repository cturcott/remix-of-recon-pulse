import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg-tire.jpg";

export default function HeroSection() {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
      {/* Background image with dark overlay */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,25%,6%)/0.92] via-[hsl(220,25%,6%)/0.85] to-[hsl(220,25%,6%)/0.6]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28 w-full">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            Reconditioning Software
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6" style={{ color: "hsl(0, 0%, 100%)" }}>
            See and control your
            <br />
            entire recon process
            <br />
            <span className="text-gradient">in real time.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "hsl(220, 10%, 70%)" }}>
            Know exactly where every vehicle sits — from acquisition to frontline.
            Eliminate bottlenecks, reduce holding costs, and get cars to the lot faster.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow"
            >
              Schedule a Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
