import { Car, Kanban, FileText, Menu, Flag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Settings, Workflow, Bell, Upload, BarChart3, LogOut, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { label: "Overview", icon: Kanban, path: "/command-center" },
  { label: "Vehicles", icon: Car, path: "/vehicles" },
  { label: "Approvals", icon: FileText, path: "/approvals" },
];

const moreItems = [
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "CSV Import", icon: Upload, path: "/import/settings" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Workflow", icon: Workflow, path: "/settings/workflow" },
  { label: "Notifications", icon: Bell, path: "/settings/notifications" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { profile, isPlatformAdmin, signOut } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}

      {/* More menu */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 pt-4">
            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSheetOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {isPlatformAdmin && (
            <Link
              to="/admin"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 mt-4 p-3 rounded-xl text-sm font-medium text-primary hover:bg-accent"
            >
              <Shield className="h-5 w-5" />
              Platform Admin
            </Link>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.title || profile?.email}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground shrink-0">
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
