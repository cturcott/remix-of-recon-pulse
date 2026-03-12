import { ReactNode } from "react";
import AppTopNav from "./AppTopNav";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppTopNav />

      <main className="pb-20 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom nav — visible only on mobile */}
      <MobileBottomNav />
    </div>
  );
}
