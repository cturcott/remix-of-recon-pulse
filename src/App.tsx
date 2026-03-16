import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DealershipProvider } from "@/contexts/DealershipContext";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
// Dashboard removed — KPIs moved to Recon Board
import CommandCenter from "./pages/CommandCenter";
import VehicleDetail from "./pages/VehicleDetail";
import Vehicles from "./pages/Vehicles";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DealershipManagement from "./pages/admin/DealershipManagement";
import UserManagement from "./pages/admin/UserManagement";
import EmailSettings from "./pages/admin/EmailSettings";
import WorkflowSettings from "./pages/WorkflowSettings";
import WorkflowNotifications from "./pages/WorkflowNotifications";
import ImportSettings from "./pages/ImportSettings";
import ImportHistory from "./pages/ImportHistory";
import ImportBatchDetail from "./pages/ImportBatchDetail";
import ImportReviewQueue from "./pages/ImportReviewQueue";
import Team from "./pages/Team";
import Approvals from "./pages/Approvals";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import ReconAgingReport from "./pages/reports/ReconAgingReport";
import StageBottleneckReport from "./pages/reports/StageBottleneckReport";
import WipQueueReport from "./pages/reports/WipQueueReport";
import TimeToFLRReport from "./pages/reports/TimeToFLRReport";
import ExceptionReport from "./pages/reports/ExceptionReport";
import ReportsDashboard from "./pages/reports/ReportsDashboard";
import ApprovalLagReport from "./pages/reports/ApprovalLagReport";
import PartsHoldReport from "./pages/reports/PartsHoldReport";
import FLROutputReport from "./pages/reports/FLROutputReport";
import ReconCostReport from "./pages/reports/ReconCostReport";
import MyTasks from "./pages/MyTasks";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (user?.user_metadata?.force_password_change) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isPlatformAdmin) return <Navigate to="/command-center" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/change-password" element={<ChangePassword />} />
    <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
    <Route path="/dashboard" element={<Navigate to="/command-center" replace />} />
    <Route path="/recon-board" element={<Navigate to="/command-center" replace />} />
    <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
    <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
    <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
    <Route path="/reports/aging" element={<ProtectedRoute><ReconAgingReport /></ProtectedRoute>} />
    <Route path="/reports/bottleneck" element={<ProtectedRoute><StageBottleneckReport /></ProtectedRoute>} />
    <Route path="/reports/wip" element={<ProtectedRoute><WipQueueReport /></ProtectedRoute>} />
    <Route path="/reports/flr" element={<ProtectedRoute><TimeToFLRReport /></ProtectedRoute>} />
    <Route path="/reports/exceptions" element={<ProtectedRoute><ExceptionReport /></ProtectedRoute>} />
    <Route path="/reports/approval-lag" element={<ProtectedRoute><ApprovalLagReport /></ProtectedRoute>} />
    <Route path="/reports/parts-hold" element={<ProtectedRoute><PartsHoldReport /></ProtectedRoute>} />
    <Route path="/reports/flr-output" element={<ProtectedRoute><FLROutputReport /></ProtectedRoute>} />
    <Route path="/reports/recon-cost" element={<ProtectedRoute><ReconCostReport /></ProtectedRoute>} />
    <Route path="/vehicle/:id" element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>} />
    <Route path="/settings/workflow" element={<ProtectedRoute><WorkflowSettings /></ProtectedRoute>} />
    <Route path="/settings/notifications" element={<ProtectedRoute><WorkflowNotifications /></ProtectedRoute>} />
    <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/dealerships" element={<ProtectedRoute><AdminRoute><DealershipManagement /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UserManagement /></AdminRoute></ProtectedRoute>} />
    <Route path="/admin/email-settings" element={<ProtectedRoute><AdminRoute><EmailSettings /></AdminRoute></ProtectedRoute>} />
    <Route path="/import/settings" element={<ProtectedRoute><ImportSettings /></ProtectedRoute>} />
    <Route path="/import/history" element={<ProtectedRoute><ImportHistory /></ProtectedRoute>} />
    <Route path="/import/batch/:batchId" element={<ProtectedRoute><ImportBatchDetail /></ProtectedRoute>} />
    <Route path="/import/review" element={<ProtectedRoute><ImportReviewQueue /></ProtectedRoute>} />
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
