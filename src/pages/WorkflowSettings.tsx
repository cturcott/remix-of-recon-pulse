import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, RotateCcw, Save, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface WorkflowStage {
  id: string;
  dealership_id: string;
  name: string;
  stage_key: string | null;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  is_start_stage: boolean;
  is_completion_stage: boolean;
  sla_days: number;
}

const DEFAULT_STAGES = [
  { name: "Intake & Check-In", stage_key: "intake", sort_order: 1, is_required: true, is_start_stage: true, is_completion_stage: false },
  { name: "Multi-Point Inspection", stage_key: "mpi", sort_order: 2, is_required: true, is_start_stage: false, is_completion_stage: false },
  { name: "Service Approvals", stage_key: "approvals", sort_order: 3, is_required: true, is_start_stage: false, is_completion_stage: false },
  { name: "Mechanical Repair", stage_key: "mechanical", sort_order: 4, is_required: false, is_start_stage: false, is_completion_stage: false },
  { name: "Cosmetic & Sublet Work", stage_key: "cosmetic", sort_order: 5, is_required: false, is_start_stage: false, is_completion_stage: false },
  { name: "Professional Detail", stage_key: "detail", sort_order: 6, is_required: false, is_start_stage: false, is_completion_stage: false },
  { name: "Photography & Merchandising", stage_key: "merchandising", sort_order: 7, is_required: false, is_start_stage: false, is_completion_stage: false },
  { name: "Final QC & Front-Line Ready", stage_key: "flr", sort_order: 8, is_required: true, is_start_stage: false, is_completion_stage: true },
];

export default function WorkflowSettings() {
  const { currentDealership } = useDealership();
  const { isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");

  const { data: fetchedStages, isLoading } = useQuery({
    queryKey: ["workflow-stages", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .order("sort_order");
      if (error) throw error;
      return data as WorkflowStage[];
    },
    enabled: !!currentDealership,
  });

  useEffect(() => {
    if (fetchedStages) {
      setStages(fetchedStages);
      setHasChanges(false);
    }
  }, [fetchedStages]);

  const handleNameChange = (idx: number, name: string) => {
    const updated = [...stages];
    updated[idx] = { ...updated[idx], name };
    setStages(updated);
    setHasChanges(true);
  };

  const handleToggleActive = (idx: number) => {
    const stage = stages[idx];
    if (stage.is_start_stage || stage.is_completion_stage) {
      toast.error("Start and completion stages cannot be disabled");
      return;
    }
    const updated = [...stages];
    updated[idx] = { ...updated[idx], is_active: !updated[idx].is_active };
    setStages(updated);
    setHasChanges(true);
  };

  const handleSLAChange = (idx: number, value: string) => {
    const updated = [...stages];
    updated[idx] = { ...updated[idx], sla_days: Math.max(1, parseInt(value) || 1) };
    setStages(updated);
    setHasChanges(true);
  };

  const handleAddStage = () => {
    const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.sort_order)) : 0;
    // Insert before completion stage
    const completionIdx = stages.findIndex((s) => s.is_completion_stage);
    const newOrder = completionIdx >= 0 ? stages[completionIdx].sort_order : maxOrder + 1;

    const updated = stages.map((s) =>
      s.sort_order >= newOrder ? { ...s, sort_order: s.sort_order + 1 } : s
    );
    updated.push({
      id: `new-${Date.now()}`,
      dealership_id: currentDealership!.id,
      name: "New Stage",
      stage_key: null,
      sort_order: newOrder,
      is_active: true,
      is_required: false,
      is_start_stage: false,
      is_completion_stage: false,
      sla_days: 5,
    });
    updated.sort((a, b) => a.sort_order - b.sort_order);
    setStages(updated);
    setHasChanges(true);
  };

  const handleDeleteStage = async (idx: number) => {
    const stage = stages[idx];
    if (stage.is_start_stage || stage.is_completion_stage) {
      toast.error("Cannot delete start or completion stage");
      return;
    }

    // Check if any vehicles are in this stage
    if (!stage.id.startsWith("new-")) {
      const { count } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("current_stage_id", stage.id);
      if (count && count > 0) {
        toast.error(`Cannot delete — ${count} vehicle(s) are currently in this stage`);
        return;
      }
    }

    const updated = stages.filter((_, i) => i !== idx);
    // Re-order
    updated.forEach((s, i) => (s.sort_order = i + 1));
    setStages(updated);
    setHasChanges(true);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...stages];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    updated.forEach((s, i) => (s.sort_order = i + 1));
    setStages(updated);
    setDragIdx(idx);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentDealership) return;

    // Validate at least one start and one completion
    const hasStart = stages.some((s) => s.is_start_stage && s.is_active);
    const hasCompletion = stages.some((s) => s.is_completion_stage && s.is_active);
    if (!hasStart || !hasCompletion) {
      toast.error("Workflow must have an active start and completion stage");
      return;
    }

    try {
      // Delete removed stages (that were previously saved)
      const currentIds = stages.filter((s) => !s.id.startsWith("new-")).map((s) => s.id);
      const originalIds = (fetchedStages ?? []).map((s) => s.id);
      const deletedIds = originalIds.filter((id) => !currentIds.includes(id));
      for (const id of deletedIds) {
        await supabase.from("workflow_stages").delete().eq("id", id);
      }

      // Upsert stages
      for (const stage of stages) {
        if (stage.id.startsWith("new-")) {
          await supabase.from("workflow_stages").insert({
            dealership_id: stage.dealership_id,
            name: stage.name,
            stage_key: stage.stage_key,
            sort_order: stage.sort_order,
            is_active: stage.is_active,
            is_required: stage.is_required,
            is_start_stage: stage.is_start_stage,
            is_completion_stage: stage.is_completion_stage,
          });
        } else {
          await supabase.from("workflow_stages").update({
            name: stage.name,
            sort_order: stage.sort_order,
            is_active: stage.is_active,
            is_required: stage.is_required,
          }).eq("id", stage.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      toast.success("Workflow saved");
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save workflow");
    }
  };

  const handleResetToDefault = async () => {
    if (!currentDealership) return;
    try {
      // Delete all existing stages
      await supabase.from("workflow_stages").delete().eq("dealership_id", currentDealership.id);

      // Insert defaults
      for (const s of DEFAULT_STAGES) {
        await supabase.from("workflow_stages").insert({
          dealership_id: currentDealership.id,
          ...s,
          is_active: true,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      toast.success("Workflow reset to default");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflow Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the reconditioning workflow stages for {currentDealership?.name ?? "your dealership"}
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!isDealershipAdmin}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Workflow?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all custom stages with the default 8-stage workflow. Historical tracking data will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetToDefault}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || !isDealershipAdmin}>
            <Save className="h-4 w-4 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading stages...</div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              draggable={isDealershipAdmin}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors ${
                !stage.is_active ? "opacity-50" : ""
              } ${dragIdx === idx ? "ring-2 ring-primary" : ""}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
              <span className="text-xs font-mono text-muted-foreground w-6">{stage.sort_order}</span>
              <Input
                value={stage.name}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                className="flex-1 h-8"
                disabled={!isDealershipAdmin}
              />
              <div className="flex items-center gap-2 shrink-0">
                {stage.is_start_stage && <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-0.5" /> Start</Badge>}
                {stage.is_completion_stage && <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-0.5" /> End</Badge>}
                {stage.stage_key && <Badge variant="outline" className="text-xs font-mono">{stage.stage_key}</Badge>}
                <Switch
                  checked={stage.is_active}
                  onCheckedChange={() => handleToggleActive(idx)}
                  disabled={!isDealershipAdmin || stage.is_start_stage || stage.is_completion_stage}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDeleteStage(idx)}
                  disabled={!isDealershipAdmin || stage.is_start_stage || stage.is_completion_stage}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          {isDealershipAdmin && (
            <Button variant="outline" className="w-full mt-4" onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-1" /> Add Stage
            </Button>
          )}
        </div>
      )}
    </AppLayout>
  );
}
