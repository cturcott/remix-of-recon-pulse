import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AddVehicleDialog from "@/components/AddVehicleDialog";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Car, Clock } from "lucide-react";

interface WorkflowStage {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_start_stage: boolean;
  is_completion_stage: boolean;
}

interface Vehicle {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number;
  stock_number: string | null;
  current_stage_id: string | null;
  status: string;
  created_at: string;
  exterior_color: string | null;
}

export default function CommandCenter() {
  const { currentDealership } = useDealership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dragVehicle, setDragVehicle] = useState<string | null>(null);

  const { data: stages = [] } = useQuery<WorkflowStage[]>({
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

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
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

  const moveVehicle = useMutation({
    mutationFn: async ({ vehicleId, toStageId, fromStageId }: { vehicleId: string; toStageId: string; fromStageId: string | null }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ current_stage_id: toStageId })
        .eq("id", vehicleId);
      if (error) throw error;

      await supabase.from("vehicle_stage_history").insert({
        vehicle_id: vehicleId,
        dealership_id: currentDealership!.id,
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        changed_by: user?.id,
      });

      // Trigger stage notification (fire-and-forget)
      supabase.functions.invoke("send-stage-notification", {
        body: {
          vehicle_id: vehicleId,
          to_stage_id: toStageId,
          dealership_id: currentDealership!.id,
          triggered_by_user_id: user?.id,
        },
      }).catch(() => {}); // Don't block on notification failures
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle moved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDrop = (stageId: string) => {
    if (!dragVehicle) return;
    const vehicle = vehicles.find((v) => v.id === dragVehicle);
    if (!vehicle || vehicle.current_stage_id === stageId) return;
    moveVehicle.mutate({ vehicleId: dragVehicle, toStageId: stageId, fromStageId: vehicle.current_stage_id });
    setDragVehicle(null);
  };

  const getDaysInRecon = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const vehiclesByStage = (stageId: string) => vehicles.filter((v) => v.current_stage_id === stageId);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Drag vehicles across stages to update progress</p>
        </div>
        <AddVehicleDialog />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 160px)" }}>
        {stages.map((stage) => {
          const stageVehicles = vehiclesByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center justify-between rounded-t-xl border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-card-foreground">{stage.name}</h3>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                    {stageVehicles.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-b-xl border border-t-0 border-border bg-muted/30 p-3 min-h-[200px]">
                {stageVehicles.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
                    <p className="text-xs text-muted-foreground">No vehicles</p>
                  </div>
                ) : (
                  stageVehicles.map((v) => (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={() => setDragVehicle(v.id)}
                      onClick={() => navigate(`/vehicle/${v.id}`)}
                      className="rounded-lg border border-border bg-card p-3 cursor-grab hover:shadow-md hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-semibold text-card-foreground">
                          {v.year} {v.make} {v.model}
                        </p>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-1">
                          <Clock className="h-3 w-3 mr-0.5" />
                          {getDaysInRecon(v.created_at)}d
                        </Badge>
                      </div>
                      {v.trim && <p className="text-xs text-muted-foreground">{v.trim}</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        <span className="font-mono">{v.stock_number || v.vin.slice(-6)}</span>
                        {v.exterior_color && <span>• {v.exterior_color}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.mileage.toLocaleString()} mi</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
