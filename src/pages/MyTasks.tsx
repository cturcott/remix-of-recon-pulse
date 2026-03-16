import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useMyTasks, useVehicleTasks, TASK_STATUSES, TASK_PRIORITIES, type VehicleTask, type UpdateTaskInput } from "@/hooks/useVehicleTasks";
import TaskDialog from "@/components/tasks/TaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useDealership } from "@/contexts/DealershipContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle, Clock, AlertTriangle, Ban, CircleDot, Pause,
  Calendar, Flag, MoreHorizontal, Edit, Car, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const statusIcons: Record<string, React.ReactNode> = {
  not_started: <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  waiting: <Pause className="h-3.5 w-3.5 text-yellow-500" />,
  blocked: <Ban className="h-3.5 w-3.5 text-destructive" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  canceled: <Ban className="h-3.5 w-3.5 text-muted-foreground" />,
};

const priorityColors: Record<string, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  high: "text-orange-600 border-orange-500/30 bg-orange-500/10",
  normal: "text-foreground border-border",
  low: "text-muted-foreground border-border",
};

export default function MyTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentDealership } = useDealership();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useMyTasks();
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch vehicle info for task display
  const vehicleIds = [...new Set(tasks.map((t) => t.vehicle_id))];
  const { data: vehicles = [] } = useQuery({
    queryKey: ["task-vehicles", vehicleIds.sort().join(",")],
    queryFn: async () => {
      if (!vehicleIds.length) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, vin, year, make, model, stock_number")
        .in("id", vehicleIds);
      if (error) throw error;
      return data;
    },
    enabled: vehicleIds.length > 0,
  });

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  // Quick complete mutation
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("vehicle_tasks").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by_user_id: user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-task-counts"] });
    },
  });

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter === "active") result = result.filter((t) => !["completed", "canceled"].includes(t.status));
    else if (statusFilter === "overdue") result = result.filter((t) => t.due_at && isPast(new Date(t.due_at)) && !["completed", "canceled"].includes(t.status));
    else if (statusFilter === "blocked") result = result.filter((t) => t.is_blocked);
    else if (statusFilter === "due_today") result = result.filter((t) => t.due_at && isToday(new Date(t.due_at)));
    else if (statusFilter === "completed") result = result.filter((t) => t.status === "completed");

    if (priorityFilter !== "all") result = result.filter((t) => t.priority === priorityFilter);

    return result;
  }, [tasks, statusFilter, priorityFilter]);

  // KPIs
  const activeTasks = tasks.filter((t) => !["completed", "canceled"].includes(t.status));
  const overdueTasks = activeTasks.filter((t) => t.due_at && isPast(new Date(t.due_at)));
  const blockedTasks = activeTasks.filter((t) => t.is_blocked);
  const dueTodayTasks = activeTasks.filter((t) => t.due_at && isToday(new Date(t.due_at)));

  if (!currentDealership) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Select a dealership to view tasks</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Tasks assigned to you across all vehicles</p>
        </div>

        {/* KPI chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={statusFilter === "active" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter("active")}
          >
            {activeTasks.length} Open
          </Badge>
          <Badge
            variant={statusFilter === "overdue" ? "default" : "outline"}
            className={cn("cursor-pointer", overdueTasks.length > 0 && statusFilter !== "overdue" && "border-destructive/50 text-destructive")}
            onClick={() => setStatusFilter("overdue")}
          >
            {overdueTasks.length} Overdue
          </Badge>
          <Badge
            variant={statusFilter === "blocked" ? "default" : "outline"}
            className={cn("cursor-pointer", blockedTasks.length > 0 && statusFilter !== "blocked" && "border-destructive/50 text-destructive")}
            onClick={() => setStatusFilter("blocked")}
          >
            {blockedTasks.length} Blocked
          </Badge>
          <Badge
            variant={statusFilter === "due_today" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter("due_today")}
          >
            {dueTodayTasks.length} Due Today
          </Badge>
          <Badge
            variant={statusFilter === "completed" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </Badge>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 w-[120px] text-xs ml-2">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {statusFilter === "active" ? "No open tasks assigned to you" : "No tasks match this filter"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const vehicle = vehicleMap.get(task.vehicle_id);
              const isOverdue = task.due_at && isPast(new Date(task.due_at)) && !["completed", "canceled"].includes(task.status);
              const isDone = task.status === "completed" || task.status === "canceled";

              return (
                <Card key={task.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Complete checkbox */}
                    {!isDone ? (
                      <div className="pt-0.5">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => completeTask.mutate(task.id)}
                          className="h-4 w-4"
                        />
                      </div>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>
                          {task.title}
                        </span>
                        {statusIcons[task.status]}
                        <Badge variant="outline" className={cn("text-[10px] px-1.5", priorityColors[task.priority])}>
                          {task.priority}
                        </Badge>
                        {task.is_blocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {vehicle && (
                          <button
                            onClick={() => navigate(`/vehicle/${task.vehicle_id}`)}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Car className="h-3 w-3" />
                            {vehicle.year} {vehicle.make} {vehicle.model}
                            <span className="font-mono">({vehicle.stock_number || vehicle.vin.slice(-6)})</span>
                          </button>
                        )}
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{task.task_type}</span>
                        {task.due_at && (
                          <span className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
                            <Calendar className="h-3 w-3" />
                            {isOverdue && <AlertTriangle className="h-3 w-3" />}
                            {format(new Date(task.due_at), "MMM d")}
                          </span>
                        )}
                        {task.is_blocked && task.blocker_reason && (
                          <span className="text-destructive">⊘ {task.blocker_reason}</span>
                        )}
                      </div>
                    </div>

                    {/* View vehicle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => navigate(`/vehicle/${task.vehicle_id}`)}
                    >
                      View
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
