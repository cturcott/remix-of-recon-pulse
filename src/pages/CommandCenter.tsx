import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

import AppLayout from "@/components/AppLayout";
import StageQueueSidebar from "@/components/recon-board/StageQueueSidebar";
import VehicleWorkCard from "@/components/recon-board/VehicleWorkCard";
import VehicleSlideUpPanel from "@/components/recon-board/VehicleSlideUpPanel";
import MobileStageSelector from "@/components/recon-board/MobileStageSelector";
import AddVehicleDialog from "@/components/AddVehicleDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, ArrowUpDown, Car, Clock, AlertTriangle } from "lucide-react";


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
  assigned_to: string | null;
  notes: string | null;
  dealership_id: string;
}

interface WorkflowStage {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_start_stage: boolean;
  is_completion_stage: boolean;
  sla_days: number;
}

type SortOption = "oldest" | "newest" | "stock";

export default function CommandCenter() {
  const { currentDealership } = useDealership();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("oldest");
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  // ─── Queries ───
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
      return (data as any[]).map((s) => ({ ...s, sla_days: s.sla_days ?? 5 })) as WorkflowStage[];
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
      return data as Vehicle[];
    },
    enabled: !!currentDealership,
  });

  // Fetch latest stage entry timestamps for each vehicle
  const { data: stageEntryMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["vehicle-stage-entries", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return {};
      const { data, error } = await supabase
        .from("vehicle_stage_history")
        .select("vehicle_id, to_stage_id, changed_at")
        .eq("dealership_id", currentDealership.id)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      // Keep the most recent entry per vehicle (first occurrence since sorted desc)
      const map: Record<string, string> = {};
      data.forEach((row: any) => {
        if (!map[row.vehicle_id]) {
          map[row.vehicle_id] = row.changed_at;
        }
      });
      return map;
    },
    enabled: !!currentDealership,
  });

  // Fetch profiles for assigned users
  const { data: profiles = [] } = useQuery({
    queryKey: ["dealership-profiles", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", currentDealership.id);
      if (error) throw error;
      const userIds = data.map((d: any) => d.user_id);
      if (userIds.length === 0) return [];
      const { data: profs, error: e2 } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      if (e2) throw e2;
      return profs;
    },
    enabled: !!currentDealership,
  });

  // Fetch notes counts per vehicle
  const { data: notesCounts = {} } = useQuery({
    queryKey: ["vehicle-notes-count", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return {};
      const { data, error } = await supabase
        .from("vehicle_notes")
        .select("vehicle_id")
        .eq("dealership_id", currentDealership.id);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((n: any) => {
        counts[n.vehicle_id] = (counts[n.vehicle_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!currentDealership,
  });

  // Fetch stage assignees to check move permissions
  const { data: stageAssigneeMap = {} } = useQuery<Record<string, string[]>>({
    queryKey: ["stage-assignees", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return {};
      const { data, error } = await supabase
        .from("workflow_stage_assignees")
        .select("workflow_stage_id, user_id")
        .eq("dealership_id", currentDealership.id);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      data.forEach((a: any) => {
        if (!map[a.workflow_stage_id]) map[a.workflow_stage_id] = [];
        map[a.workflow_stage_id].push(a.user_id);
      });
      return map;
    },
    enabled: !!currentDealership,
  });

  const isAdmin = roles.includes("platform_admin") || roles.includes("dealership_admin") || roles.includes("recon_manager");

  const canUserMoveFromStage = (stageId: string | null): boolean => {
    if (isAdmin) return true;
    if (!stageId || !user) return false;
    const assignees = stageAssigneeMap[stageId];
    return assignees ? assignees.includes(user.id) : false;
  };

  // ─── Mutations ───
  const moveVehicle = useMutation({
    mutationFn: async ({
      vehicleId,
      toStageId,
      fromStageId,
    }: {
      vehicleId: string;
      toStageId: string;
      fromStageId: string | null;
    }) => {
      // Auto-assign user if stage has assignees configured
      const { data: assignees } = await supabase
        .from("workflow_stage_assignees")
        .select("user_id")
        .eq("workflow_stage_id", toStageId)
        .limit(1);

      const assignedTo = assignees && assignees.length > 0 ? assignees[0].user_id : null;

      const { error } = await supabase
        .from("vehicles")
        .update({
          current_stage_id: toStageId,
          ...(assignedTo ? { assigned_to: assignedTo } : {}),
        })
        .eq("id", vehicleId);
      if (error) throw error;

      await supabase.from("vehicle_stage_history").insert({
        vehicle_id: vehicleId,
        dealership_id: currentDealership!.id,
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        changed_by: user?.id,
      });

      supabase.functions
        .invoke("send-stage-notification", {
          body: {
            vehicle_id: vehicleId,
            to_stage_id: toStageId,
            dealership_id: currentDealership!.id,
            triggered_by_user_id: user?.id,
          },
        })
        .catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stage-history"] });
      toast.success("Vehicle moved to next stage");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Computed ───
  // Auto-select first stage
  if (!selectedStageId && stages.length > 0) {
    setSelectedStageId(stages[0].id);
  }

  const getStageAgingDays = (vehicleId: string, createdAt: string) => {
    const entryTime = stageEntryMap[vehicleId] || createdAt;
    return (Date.now() - new Date(entryTime).getTime()) / (1000 * 60 * 60 * 24);
  };

  const stagesWithCounts = useMemo(
    () =>
      stages.map((stage) => {
        const stageVehicles = vehicles.filter(
          (v) => v.current_stage_id === stage.id
        );
        const sla = stage.sla_days;
        const overdueInStage = stageVehicles.filter(
          (v) => getStageAgingDays(v.id, v.created_at) >= sla
        ).length;
        return {
          ...stage,
          vehicleCount: stageVehicles.length,
          warningCount: stageVehicles.filter(
            (v) => {
              const d = getStageAgingDays(v.id, v.created_at);
              return d >= sla * 0.7 && d < sla;
            }
          ).length,
          dangerCount: overdueInStage,
        };
      }),
    [stages, vehicles, stageEntryMap]
  );

  const currentStageVehicles = useMemo(() => {
    let result = vehicles.filter((v) => v.current_stage_id === selectedStageId);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          v.stock_number?.toLowerCase().includes(q) ||
          `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "stock":
          return (a.stock_number || "").localeCompare(b.stock_number || "");
        default: // oldest
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });

    return result;
  }, [vehicles, selectedStageId, searchQuery, sortBy]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const getNextStage = (currentStageId: string | null) => {
    if (!currentStageId) return null;
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    if (currentIndex < 0 || currentIndex >= stages.length - 1) return null;
    return stages[currentIndex + 1];
  };

  const getAssigneeName = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    const p = profiles.find((pr: any) => pr.user_id === assignedTo);
    return p ? `${p.first_name} ${p.last_name}` : null;
  };

  const selectedStageName =
    stages.find((s) => s.id === selectedStageId)?.name ?? "Queue";

  const totalInRecon = vehicles.length;
  const getDays = (v: Vehicle) => Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysInRecon = totalInRecon > 0 ? Math.round(vehicles.reduce((sum, v) => sum + getDays(v), 0) / totalInRecon) : null;
  const overdueCount = stagesWithCounts.reduce((s, st) => s + st.dangerCount, 0);

  // ─── Render ───
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 lg:-m-8 -mt-4 sm:-mt-6 lg:-mt-8">
        {/* Top bar: KPI metrics + add vehicle */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card shrink-0 gap-2 overflow-x-auto">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Inline KPI chips */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 font-medium text-foreground">
                <Car className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold">{totalInRecon}</span>
                <span className="text-muted-foreground hidden sm:inline">in recon</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-bold">{avgDaysInRecon ?? "—"}</span>
                <span className="text-muted-foreground hidden sm:inline">avg days</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-bold">{overdueCount}</span>
                <span className="hidden sm:inline">overdue</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AddVehicleDialog />
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* A. Left Sidebar — desktop only */}
          {!isMobile && (
            <StageQueueSidebar
              stages={stagesWithCounts}
              selectedStageId={selectedStageId}
              onSelectStage={setSelectedStageId}
              totalInRecon={totalInRecon}
            />
          )}

          {/* B. Center: Vehicle cards */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile stage selector */}
            {isMobile && (
              <div className="p-3 border-b border-border">
                <MobileStageSelector
                  stages={stagesWithCounts}
                  selectedStageId={selectedStageId}
                  onSelectStage={setSelectedStageId}
                />
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search VIN, stock #, vehicle..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="stock">Stock #</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {currentStageVehicles.length} vehicle
                {currentStageVehicles.length !== 1 ? "s" : ""} in{" "}
                <strong>{selectedStageName}</strong>
              </span>
            </div>

            {/* Vehicle list */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {currentStageVehicles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No vehicles in this stage
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vehicles will appear here when they enter this workflow
                      stage
                    </p>
                  </div>
                ) : (
                  currentStageVehicles.map((v) => {
                    const nextStage = getNextStage(v.current_stage_id);
                    return (
                      <VehicleWorkCard
                        key={v.id}
                        vehicle={v}
                        nextStageName={nextStage?.name ?? null}
                        assigneeName={getAssigneeName(v.assigned_to)}
                        notesCount={(notesCounts as Record<string, number>)[v.id] || 0}
                        isSelected={selectedVehicleId === v.id}
                        canMove={canUserMoveFromStage(v.current_stage_id)}
                        isAdmin={isAdmin}
                        allStages={stages}
                        currentStageId={v.current_stage_id}
                        onSelect={() => {
                          setSelectedVehicleId(v.id);
                          if (isMobile) setMobileContextOpen(true);
                        }}
                        onMoveNext={() => {
                          if (!nextStage) return;
                          moveVehicle.mutate({
                            vehicleId: v.id,
                            toStageId: nextStage.id,
                            fromStageId: v.current_stage_id,
                          });
                        }}
                        onMoveToStage={(stageId) => {
                          moveVehicle.mutate({
                            vehicleId: v.id,
                            toStageId: stageId,
                            fromStageId: v.current_stage_id,
                          });
                        }}
                        onViewDetail={() => navigate(`/vehicle/${v.id}`)}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* C. Right context panel — desktop */}
          {!isMobile && selectedVehicle && (
            <VehicleContextPanel
              vehicle={selectedVehicle}
              stages={stages}
              onClose={() => setSelectedVehicleId(null)}
            />
          )}
        </div>

        {/* Mobile context panel as sheet */}
        {isMobile && selectedVehicle && (
          <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
            <SheetContent side="bottom" className="h-[75vh] p-0 rounded-t-2xl">
              <VehicleContextPanel
                vehicle={selectedVehicle}
                stages={stages}
                onClose={() => setMobileContextOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </AppLayout>
  );
}
