import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DealershipProvider } from "@/contexts/DealershipContext";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CommandCenter from "./pages/CommandCenter";
import VehicleDetail from "./pages/VehicleDetail";
import Vehicles from "./pages/Vehicles";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DealershipManagement from "./pages/admin/DealershipManagement";
import UserManagement from "./pages/admin/UserManagement";
import EmailSettings from "./pages/admin/EmailSettings";
import WorkflowSettings from "./pages/WorkflowSettings";
import WorkflowNotifications from "./pages/WorkflowNotifications";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
    <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
    <Route path="/vehicle/:id" element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>} />
    <Route path="/settings/workflow" element={<ProtectedRoute><WorkflowSettings /></ProtectedRoute>} />
    <Route path="/settings/notifications" element={<ProtectedRoute><WorkflowNotifications /></ProtectedRoute>} />
    <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/dealerships" element={<ProtectedRoute><AdminRoute><DealershipManagement /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UserManagement /></AdminRoute></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DealershipProvider>
            <AppRoutes />
          </DealershipProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
