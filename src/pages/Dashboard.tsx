import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import AddVehicleDialog from "@/components/AddVehicleDialog";
import { Car, Clock, CheckCircle, AlertTriangle, DollarSign, Timer, ShieldAlert, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { currentDealership } = useDealership();

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .eq("status", "in_recon");
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["workflow-stages", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  const inReconCount = vehicles.length;
  const getDays = (v: any) => Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const avgDays = inReconCount > 0 ? Math.round(vehicles.reduce((sum, v) => sum + getDays(v), 0) / inReconCount) : null;
  const overdueVehicles = vehicles.filter((v) => getDays(v) > 10);

  // Find approval stage
  const approvalStage = stages.find((s: any) => s.stage_key === "approvals");
  const awaitingApproval = approvalStage ? vehicles.filter((v) => v.current_stage_id === approvalStage.id).length : 0;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time recon performance overview</p>
        </div>
        <AddVehicleDialog />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Vehicles in Recon" value={inReconCount} icon={<Car className="h-5 w-5" />} />
        <StatCard label="Avg Days in Recon" value={avgDays ?? "—"} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Overdue (>10 days)" value={overdueVehicles.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Awaiting Approval" value={awaitingApproval} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      {/* Vehicles needing attention */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Needs Attention</h2>
        {overdueVehicles.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12">
            <p className="text-sm text-muted-foreground">No vehicles require attention</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Vehicle</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Stock #</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Days in Recon</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Stage</th>
                </tr>
              </thead>
              <tbody>
                {overdueVehicles.slice(0, 10).map((v) => {
                  const stage = stages.find((s: any) => s.id === v.current_stage_id);
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {v.year} {v.make} {v.model}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{v.stock_number || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="destructive" className="text-xs">{getDays(v)} days</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{stage?.name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
