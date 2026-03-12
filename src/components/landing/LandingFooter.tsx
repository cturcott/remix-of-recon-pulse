import { Link } from "react-router-dom";
import { Car } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
                <Car className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-card-foreground">ReconPulse</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The reconditioning workflow platform built for modern dealerships. From acquisition to frontline, faster.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-card-foreground mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-card-foreground mb-3">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Success Stories</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-card-foreground mb-3">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Log In</Link></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2026 ReconPulse. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Sales: (800) 555-1234 &nbsp;·&nbsp; Support: (800) 555-5678</p>
        </div>
      </div>
    </footer>
  );
}
