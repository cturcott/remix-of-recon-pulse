import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <AppHeader />

      <main className="md:pl-64 pt-14 pb-20 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom nav — visible only on mobile */}
      <MobileBottomNav />
    </div>
  );
}
