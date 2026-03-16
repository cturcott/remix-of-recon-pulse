import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealership } from "@/contexts/DealershipContext";
import { toast } from "sonner";

export const TASK_TYPES = [
  "Inspection",
  "Mechanical Repair",
  "Parts Order",
  "Approval Needed",
  "Cosmetic Repair",
  "PDR",
  "Glass",
  "Wheel Repair",
  "Interior Repair",
  "Detail",
  "Photos",
  "Buyer's Guide / Merchandising",
  "QC Check",
  "Miscellaneous",
] as const;

export const TASK_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const BLOCKER_REASONS = [
  "Waiting on parts",
  "Waiting on approval",
  "Waiting on vendor",
  "Waiting on customer info",
  "Waiting on internal team",
  "Need management decision",
  "Other",
] as const;

export type TaskStatus = "not_started" | "in_progress" | "waiting" | "blocked" | "completed" | "canceled";
export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface VehicleTask {
  id: string;
  dealership_id: string;
  vehicle_id: string;
  title: string;
  description: string | null;
  task_type: string;
  linked_stage_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_user_id: string | null;
  due_at: string | null;
  is_blocked: boolean;
  blocker_reason: string | null;
  blocker_note: string | null;
  blocked_at: string | null;
  blocked_by_user_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by_user_id: string | null;
  canceled_at: string | null;
  canceled_by_user_id: string | null;
  is_deleted: boolean;
}

export interface TaskComment {
  id: string;
  task_id: string;
  dealership_id: string;
  user_id: string | null;
  comment_text: string;
  created_at: string;
}

export interface CreateTaskInput {
  vehicle_id: string;
  title: string;
  description?: string;
  task_type?: string;
  linked_stage_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_user_id?: string | null;
  due_at?: string | null;
  is_blocked?: boolean;
  blocker_reason?: string | null;
  blocker_note?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  task_type?: string;
  linked_stage_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_user_id?: string | null;
  due_at?: string | null;
  is_blocked?: boolean;
  blocker_reason?: string | null;
  blocker_note?: string | null;
}

export function useVehicleTasks(vehicleId?: string) {
  const { user } = useAuth();
  const { currentDealership } = useDealership();
  const queryClient = useQueryClient();
  const dealershipId = currentDealership?.id;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["vehicle-tasks", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("vehicle_tasks")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as VehicleTask[]) ?? [];
    },
    enabled: !!vehicleId,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!dealershipId || !user) throw new Error("Missing context");
      const now = new Date().toISOString();
      const insertData: any = {
        dealership_id: dealershipId,
        vehicle_id: input.vehicle_id,
        title: input.title,
        description: input.description || null,
        task_type: input.task_type || "Miscellaneous",
        linked_stage_id: input.linked_stage_id || null,
        status: input.status || "not_started",
        priority: input.priority || "normal",
        assignee_user_id: input.assignee_user_id || null,
        due_at: input.due_at || null,
        is_blocked: input.is_blocked || false,
        blocker_reason: input.blocker_reason || null,
        blocker_note: input.blocker_note || null,
        blocked_at: input.is_blocked ? now : null,
        blocked_by_user_id: input.is_blocked ? user.id : null,
        created_by_user_id: user.id,
      };
      const { error } = await supabase.from("vehicle_tasks").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-task-counts"] });
      toast.success("Task created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTask = useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      if (!user) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const updateData: any = { updated_at: now };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.task_type !== undefined) updateData.task_type = input.task_type;
      if (input.linked_stage_id !== undefined) updateData.linked_stage_id = input.linked_stage_id;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.assignee_user_id !== undefined) updateData.assignee_user_id = input.assignee_user_id;
      if (input.due_at !== undefined) updateData.due_at = input.due_at;

      // Handle status transitions
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === "completed") {
          updateData.completed_at = now;
          updateData.completed_by_user_id = user.id;
          updateData.is_blocked = false;
        } else if (input.status === "canceled") {
          updateData.canceled_at = now;
          updateData.canceled_by_user_id = user.id;
          updateData.is_blocked = false;
        } else if (input.status === "blocked") {
          updateData.is_blocked = true;
          updateData.blocked_at = now;
          updateData.blocked_by_user_id = user.id;
          if (input.blocker_reason) updateData.blocker_reason = input.blocker_reason;
          if (input.blocker_note) updateData.blocker_note = input.blocker_note;
        } else {
          // If moving away from blocked
          updateData.is_blocked = false;
        }
      }

      if (input.is_blocked !== undefined && input.status === undefined) {
        updateData.is_blocked = input.is_blocked;
        if (input.is_blocked) {
          updateData.status = "blocked";
          updateData.blocked_at = now;
          updateData.blocked_by_user_id = user.id;
          if (input.blocker_reason) updateData.blocker_reason = input.blocker_reason;
          if (input.blocker_note) updateData.blocker_note = input.blocker_note;
        }
      }

      const { error } = await supabase.from("vehicle_tasks").update(updateData).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-task-counts"] });
      toast.success("Task updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("vehicle_tasks")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-task-counts"] });
      toast.success("Task removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Derived counts
  const openTasks = tasks.filter((t) => !["completed", "canceled"].includes(t.status));
  const overdueTasks = openTasks.filter((t) => t.due_at && new Date(t.due_at) < new Date());
  const blockedTasks = tasks.filter((t) => t.is_blocked);
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    openTasks,
    overdueTasks,
    blockedTasks,
    completedTasks,
    counts: {
      open: openTasks.length,
      overdue: overdueTasks.length,
      blocked: blockedTasks.length,
      completed: completedTasks.length,
      total: tasks.length,
    },
  };
}

// Hook for fetching task counts per vehicle (for board cards)
export function useVehicleTaskCounts(vehicleIds: string[]) {
  return useQuery({
    queryKey: ["vehicle-task-counts", vehicleIds.sort().join(",")],
    queryFn: async () => {
      if (!vehicleIds.length) return new Map<string, { open: number; overdue: number; blocked: number }>();
      const { data, error } = await supabase
        .from("vehicle_tasks")
        .select("id, vehicle_id, status, is_blocked, due_at")
        .in("vehicle_id", vehicleIds)
        .eq("is_deleted", false)
        .not("status", "in", '("completed","canceled")');
      if (error) throw error;

      const counts = new Map<string, { open: number; overdue: number; blocked: number }>();
      const now = new Date();
      (data ?? []).forEach((t: any) => {
        if (!counts.has(t.vehicle_id)) counts.set(t.vehicle_id, { open: 0, overdue: 0, blocked: 0 });
        const c = counts.get(t.vehicle_id)!;
        c.open++;
        if (t.is_blocked) c.blocked++;
        if (t.due_at && new Date(t.due_at) < now) c.overdue++;
      });
      return counts;
    },
    enabled: vehicleIds.length > 0,
  });
}

// Hook for "My Tasks" view
export function useMyTasks() {
  const { user } = useAuth();
  const { currentDealership } = useDealership();

  return useQuery({
    queryKey: ["my-tasks", user?.id, currentDealership?.id],
    queryFn: async () => {
      if (!user || !currentDealership) return [];
      const { data, error } = await supabase
        .from("vehicle_tasks")
        .select("*")
        .eq("assignee_user_id", user.id)
        .eq("dealership_id", currentDealership.id)
        .eq("is_deleted", false)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as unknown as VehicleTask[]) ?? [];
    },
    enabled: !!user && !!currentDealership,
  });
}

// Hook for task comments
export function useTaskComments(taskId?: string) {
  const { user } = useAuth();
  const { currentDealership } = useDealership();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("vehicle_task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as TaskComment[]) ?? [];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async ({ taskId, text }: { taskId: string; text: string }) => {
      if (!user || !currentDealership) throw new Error("Missing context");
      const { error } = await supabase.from("vehicle_task_comments").insert({
        task_id: taskId,
        dealership_id: currentDealership.id,
        user_id: user.id,
        comment_text: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast.success("Comment added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { comments, isLoading, addComment };
}
