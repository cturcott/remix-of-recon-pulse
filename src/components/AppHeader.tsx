import DealershipSwitcher from "./DealershipSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function AppHeader() {
  const { profile, isPlatformAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-6 ml-64">
      <DealershipSwitcher />

      <div className="flex items-center gap-3">
        {isPlatformAdmin && (
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="text-primary gap-1.5">
              <Shield className="h-4 w-4" />
              Platform Admin
            </Button>
          </Link>
        )}
        <span className="text-sm text-muted-foreground">
          {profile?.first_name} {profile?.last_name}
        </span>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
