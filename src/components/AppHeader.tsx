import DealershipSwitcher from "./DealershipSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Car } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppHeader() {
  const { profile, isPlatformAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4 sm:px-6 md:ml-64">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
          <Car className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-base font-bold text-foreground tracking-tight">
          Recon<span className="text-gradient">Pulse</span>
        </span>
      </div>

      {/* Desktop: dealership switcher */}
      <div className="hidden md:block">
        <DealershipSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile dealership switcher — compact */}
        <div className="md:hidden">
          <DealershipSwitcher />
        </div>

        {isPlatformAdmin && (
          <Link to="/admin" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-primary gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">Platform Admin</span>
            </Button>
          </Link>
        )}
        <span className="hidden md:inline text-sm text-muted-foreground">
          {profile?.first_name} {profile?.last_name}
        </span>
        <Button variant="ghost" size="icon" onClick={signOut} className="hidden md:flex text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
