import { Link } from "react-router-dom";
import { Car, Menu, X } from "lucide-react";
import { useState } from "react";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Recon<span className="text-gradient">Pulse</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why ReconPulse</a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log In
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-glow"
          >
            Schedule a Demo
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3">
          <a href="#problem" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Why ReconPulse</a>
          <a href="#features" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
          <hr className="border-border" />
          <Link to="/auth" className="block text-sm font-medium text-foreground">Log In</Link>
          <Link to="/auth" className="inline-flex items-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Schedule a Demo
          </Link>
        </div>
      )}
    </header>
  );
}
