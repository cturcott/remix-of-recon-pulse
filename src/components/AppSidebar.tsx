import { Car, LayoutDashboard, Kanban, FileText, Settings, Users, TruckIcon, BarChart3, Bell, Package, Workflow } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Command Center", icon: Kanban, path: "/command-center" },
  { label: "Vehicles", icon: Car, path: "/vehicles" },
  { label: "Approvals", icon: FileText, path: "/approvals" },
  { label: "Vendors", icon: TruckIcon, path: "/vendors" },
  { label: "Parts", icon: Package, path: "/parts" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
];

const bottomNavItems = [
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Workflow", icon: Workflow, path: "/settings/workflow" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <Car className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
          Recon<span className="text-gradient">Pulse</span>
        </span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Operations</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">John Davis</p>
            <p className="text-xs text-muted-foreground truncate">Used Car Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
