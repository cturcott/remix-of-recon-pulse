import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type WorkflowStage = Database["public"]["Tables"]["workflow_stages"]["Row"];
type StageHistory = Database["public"]["Tables"]["vehicle_stage_history"]["Row"];

export interface ReportVehicle extends Vehicle {
  stageName?: string;
  stageAge?: number;
  totalReconAge?: number;
  assigneeName?: string;
  slaStatus?: "on_track" | "warning" | "overdue";
  stageEnteredAt?: string;
}

export function useReportData() {
  const { currentDealership, dealerships } = useDealership();
  const { isPlatformAdmin } = useAuth();

  const dealershipId = currentDealership?.id;

  const { data: stages = [] } = useQuery({
    queryKey: ["report-stages", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("dealership_id", dealershipId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as WorkflowStage[];
    },
    enabled: !!dealershipId,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["report-vehicles", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("dealership_id", dealershipId);
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!dealershipId,
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ["report-stage-history", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("vehicle_stage_history")
        .select("*")
        .eq("dealership_id", dealershipId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data as StageHistory[];
    },
    enabled: !!dealershipId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data: assignments } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", dealershipId);
      if (!assignments?.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", assignments.map((a) => a.user_id));
      return profs || [];
    },
    enabled: !!dealershipId,
  });

  const { data: repairItems = [] } = useQuery({
    queryKey: ["report-repair-items", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("repair_items")
        .select("*")
        .eq("dealership_id", dealershipId);
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  // Build enriched vehicle data
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const profileMap = new Map(profiles.map((p: any) => [p.user_id, `${p.first_name} ${p.last_name}`]));

  // Latest stage entry per vehicle
  const stageEntryMap = new Map<string, string>();
  stageHistory.forEach((h) => {
    if (!stageEntryMap.has(h.vehicle_id)) {
      stageEntryMap.set(h.vehicle_id, h.changed_at);
    }
  });

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  const enrichedVehicles: ReportVehicle[] = vehicles.map((v) => {
    const stage = v.current_stage_id ? stageMap.get(v.current_stage_id) : null;
    const stageEnteredAt = stageEntryMap.get(v.id) || v.created_at;
    const stageAge = (now - new Date(stageEnteredAt).getTime()) / dayMs;
    const totalReconAge = (now - new Date(v.created_at).getTime()) / dayMs;
    const slaDays = stage?.sla_days ?? 5;

    let slaStatus: "on_track" | "warning" | "overdue" = "on_track";
    if (stageAge >= slaDays) slaStatus = "overdue";
    else if (stageAge >= slaDays * 0.7) slaStatus = "warning";

    return {
      ...v,
      stageName: stage?.name ?? "Unknown",
      stageAge,
      totalReconAge,
      assigneeName: v.assigned_to ? profileMap.get(v.assigned_to) ?? undefined : undefined,
      slaStatus,
      stageEnteredAt,
    };
  });

  return {
    vehicles: enrichedVehicles,
    stages,
    stageHistory,
    profiles,
    repairItems,
    dealerships: isPlatformAdmin ? dealerships : dealerships,
    isLoading: vehiclesLoading,
    stageMap,
    profileMap,
  };
}
