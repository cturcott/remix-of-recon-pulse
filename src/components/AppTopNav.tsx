import { Car, LayoutDashboard, Kanban, FileText, Settings, Users, Upload, Workflow, Bell, LogOut, Shield, ChevronDown, BarChart3, TruckIcon, Package, Clock, AlertTriangle, Layers, Timer, AlertCircle, Flag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DealershipSwitcher from "./DealershipSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { label: "Overview", icon: Kanban, path: "/command-center" },
  { label: "Vehicles", icon: Car, path: "/vehicles" },
  { label: "Approvals", icon: FileText, path: "/approvals" },
];

const reportMenuItems = [
  { label: "Reports Dashboard", icon: BarChart3, path: "/reports" },
  { label: "Recon Aging", icon: Clock, path: "/reports/aging" },
  { label: "Stage Bottleneck", icon: Layers, path: "/reports/bottleneck" },
  { label: "WIP Queue", icon: Car, path: "/reports/wip" },
  { label: "Time to FLR", icon: Timer, path: "/reports/flr" },
  { label: "Exceptions", icon: AlertCircle, path: "/reports/exceptions" },
];

const manageMenuItems = [
  { label: "CSV Import", icon: Upload, path: "/import/settings" },
  { label: "Import History", icon: BarChart3, path: "/import/history" },
  { label: "Workflow Stages", icon: Workflow, path: "/settings/workflow" },
  { label: "Notifications", icon: Bell, path: "/settings/notifications" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function AppTopNav() {
  const location = useLocation();
  const { profile, isPlatformAdmin, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isInGroup = (items: { path: string }[]) =>
    items.some((item) => location.pathname.startsWith(item.path));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Logo */}
        <Link to="/command-center" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
            <Car className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight hidden sm:inline">
            Recon<span className="text-gradient">Pulse</span>
          </span>
        </Link>

        {/* Dealership Switcher */}
        <div className="hidden md:block">
          <DealershipSwitcher />
        </div>

        {/* Primary nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {primaryLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(link.path)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}

          {/* Reports dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isInGroup(reportMenuItems)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Reports
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {reportMenuItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Manage dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isInGroup(manageMenuItems)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Settings className="h-4 w-4" />
                Manage
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {manageMenuItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link to={item.path} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mobile dealership switcher */}
          <div className="md:hidden">
            <DealershipSwitcher />
          </div>

          {isPlatformAdmin && (
            <Link to="/admin" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-primary gap-1.5">
                <Shield className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
              </Button>
            </Link>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {`${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "??"}
                </div>
                <span className="hidden md:inline text-sm text-foreground font-medium">
                  {profile?.first_name}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.title || profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
