import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, RotateCcw, Save, Lock, UserPlus, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface TeamMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface StageAssignee {
  id: string;
  workflow_stage_id: string;
  user_id: string;
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
  const { currentDealership, loading: dealershipLoading } = useDealership();
  const { isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");

  const { data: fetchedStages, isLoading: stagesLoading, error: stagesError } = useQuery({
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

  // Fetch team members for this dealership
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-list", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data: assignments } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", currentDealership.id);
      if (!assignments || assignments.length === 0) return [];

      const userIds = assignments.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds)
        .eq("status", "active");

      // Filter out platform admins
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const platformAdminIds = new Set(
        (userRoles ?? []).filter((r) => r.role === "platform_admin").map((r) => r.user_id)
      );

      return (profiles ?? []).filter((p) => !platformAdminIds.has(p.user_id)) as TeamMember[];
    },
    enabled: !!currentDealership,
  });

  // Fetch existing stage assignees
  const { data: stageAssignees = [], refetch: refetchAssignees } = useQuery({
    queryKey: ["stage-assignees", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const stageIds = (fetchedStages ?? []).map((s) => s.id);
      if (stageIds.length === 0) return [];
      const { data, error } = await supabase
        .from("workflow_stage_assignees")
        .select("id, workflow_stage_id, user_id")
        .in("workflow_stage_id", stageIds);
      if (error) throw error;
      return (data ?? []) as StageAssignee[];
    },
    enabled: !!currentDealership && !!fetchedStages && fetchedStages.length > 0,
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

    const hasStart = stages.some((s) => s.is_start_stage && s.is_active);
    const hasCompletion = stages.some((s) => s.is_completion_stage && s.is_active);
    if (!hasStart || !hasCompletion) {
      toast.error("Workflow must have an active start and completion stage");
      return;
    }

    try {
      const currentIds = stages.filter((s) => !s.id.startsWith("new-")).map((s) => s.id);
      const originalIds = (fetchedStages ?? []).map((s) => s.id);
      const deletedIds = originalIds.filter((id) => !currentIds.includes(id));
      for (const id of deletedIds) {
        await supabase.from("workflow_stages").delete().eq("id", id);
      }

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
            sla_days: stage.sla_days,
          } as any);
        } else {
          await supabase.from("workflow_stages").update({
            name: stage.name,
            sort_order: stage.sort_order,
            is_active: stage.is_active,
            is_required: stage.is_required,
            sla_days: stage.sla_days,
          } as any).eq("id", stage.id);
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
      await supabase.from("workflow_stages").delete().eq("dealership_id", currentDealership.id);
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

  // ─── Assignee Management ───
  const getAssigneesForStage = (stageId: string) =>
    stageAssignees.filter((a) => a.workflow_stage_id === stageId);

  const getMemberName = (userId: string) => {
    const m = teamMembers.find((t) => t.user_id === userId);
    return m ? `${m.first_name} ${m.last_name}` : "Unknown";
  };

  const handleAddAssignee = async (stageId: string, userId: string) => {
    if (!currentDealership || stageId.startsWith("new-")) {
      toast.error("Save the stage first before assigning users");
      return;
    }
    try {
      const { error } = await supabase.from("workflow_stage_assignees").insert({
        workflow_stage_id: stageId,
        user_id: userId,
        dealership_id: currentDealership.id,
      } as any);
      if (error) throw error;
      refetchAssignees();
      toast.success("User assigned to stage");
    } catch (err: any) {
      if (err.message?.includes("duplicate")) {
        toast.error("User already assigned to this stage");
      } else {
        toast.error(err.message || "Failed to assign user");
      }
    }
  };

  const handleRemoveAssignee = async (assigneeId: string) => {
    try {
      const { error } = await supabase
        .from("workflow_stage_assignees")
        .delete()
        .eq("id", assigneeId);
      if (error) throw error;
      refetchAssignees();
      toast.success("User removed from stage");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user");
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

      {dealershipLoading || isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading stages...</div>
      ) : !currentDealership ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">No dealership selected</div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const assignees = getAssigneesForStage(stage.id);
            const availableMembers = teamMembers.filter(
              (m) => !assignees.some((a) => a.user_id === m.user_id)
            );

            return (
              <div
                key={stage.id}
                draggable={isDealershipAdmin}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={() => setDragIdx(null)}
                className={`rounded-lg border border-border bg-card p-3 transition-colors ${
                  !stage.is_active ? "opacity-50" : ""
                } ${dragIdx === idx ? "ring-2 ring-primary" : ""}`}
              >
                {/* Top row: stage config */}
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground w-6">{stage.sort_order}</span>
                  <Input
                    value={stage.name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    className="flex-1 h-8"
                    disabled={!isDealershipAdmin}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Overdue Time</span>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={stage.sla_days}
                      onChange={(e) => handleSLAChange(idx, e.target.value)}
                      className="h-8 w-16 text-center text-xs"
                      disabled={!isDealershipAdmin}
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">days</span>
                  </div>
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

                {/* Bottom row: assignees */}
                {isDealershipAdmin && !stage.id.startsWith("new-") && (
                  <div className="flex items-center gap-2 mt-2 ml-[3.25rem] flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">Auto-assign:</span>
                    {assignees.map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-xs gap-1 pl-2 pr-1">
                        {getMemberName(a.user_id)}
                        <button
                          onClick={() => handleRemoveAssignee(a.id)}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {availableMembers.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                            <UserPlus className="h-3 w-3" />
                            Assign
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Assign user to stage</p>
                          {availableMembers.map((m) => (
                            <button
                              key={m.user_id}
                              onClick={() => handleAddAssignee(stage.id, m.user_id)}
                              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              {m.first_name} {m.last_name}
                              <span className="text-xs text-muted-foreground ml-1">({m.email})</span>
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                    {assignees.length === 0 && availableMembers.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No team members available</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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
