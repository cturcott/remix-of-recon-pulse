import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background dark">
      <AppSidebar />
      <AppHeader />
      <main className="pl-64 pt-14">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
