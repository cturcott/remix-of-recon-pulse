import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreHorizontal, Edit, Trash2, CheckCircle, AlertTriangle,
  Clock, Ban, CircleDot, Pause, User, Calendar, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isPast } from "date-fns";
import {
  type VehicleTask, type TaskStatus, type CreateTaskInput, type UpdateTaskInput,
  useVehicleTasks, TASK_STATUSES,
} from "@/hooks/useVehicleTasks";
import TaskDialog from "./TaskDialog";

interface VehicleTaskSectionProps {
  vehicleId: string;
  stages?: { id: string; name: string }[];
  teamMembers?: { user_id: string; name: string }[];
  profileMap?: Map<string, string>;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
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

export default function VehicleTaskSection({
  vehicleId, stages = [], teamMembers = [], profileMap,
}: VehicleTaskSectionProps) {
  const { tasks, createTask, updateTask, deleteTask, counts } = useVehicleTasks(vehicleId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<VehicleTask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = tasks.filter((t) => !["completed", "canceled"].includes(t.status));
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "canceled");

  const handleSave = (input: CreateTaskInput | UpdateTaskInput) => {
    if ("vehicle_id" in input) {
      createTask.mutate(input, { onSuccess: () => setDialogOpen(false) });
    } else {
      updateTask.mutate(input as UpdateTaskInput, { onSuccess: () => { setDialogOpen(false); setEditingTask(null); } });
    }
  };

  const handleQuickComplete = (task: VehicleTask) => {
    updateTask.mutate({ id: task.id, status: "completed" });
  };

  const handleEdit = (task: VehicleTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    if (profileMap?.has(userId)) return profileMap.get(userId);
    const member = teamMembers.find((m) => m.user_id === userId);
    return member?.name ?? "Unknown";
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
          <div className="flex items-center gap-1.5">
            {counts.open > 0 && (
              <Badge variant="secondary" className="text-xs">{counts.open} open</Badge>
            )}
            {counts.overdue > 0 && (
              <Badge variant="destructive" className="text-xs">{counts.overdue} overdue</Badge>
            )}
            {counts.blocked > 0 && (
              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">{counts.blocked} blocked</Badge>
            )}
          </div>
        </div>
        <Button size="sm" className="gap-1" onClick={handleNewTask}>
          <Plus className="h-3.5 w-3.5" /> Add Task
        </Button>
      </div>

      {/* Open Tasks */}
      <div className="divide-y divide-border">
        {openTasks.length === 0 && completedTasks.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No tasks yet. Click "Add Task" to create one.
          </div>
        )}

        {openTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            assigneeName={getAssigneeName(task.assignee_user_id)}
            stageName={stages.find((s) => s.id === task.linked_stage_id)?.name}
            onComplete={() => handleQuickComplete(task)}
            onEdit={() => handleEdit(task)}
            onDelete={() => deleteTask.mutate(task.id)}
          />
        ))}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full px-5 py-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {completedTasks.length} completed task{completedTasks.length !== 1 ? "s" : ""}
            <span className="text-[10px]">{showCompleted ? "▲" : "▼"}</span>
          </button>
          {showCompleted && (
            <div className="divide-y divide-border opacity-60">
              {completedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  assigneeName={getAssigneeName(task.assignee_user_id)}
                  stageName={stages.find((s) => s.id === task.linked_stage_id)?.name}
                  onEdit={() => handleEdit(task)}
                  onDelete={() => deleteTask.mutate(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingTask(null); }}
        task={editingTask}
        vehicleId={vehicleId}
        stages={stages}
        teamMembers={teamMembers}
        onSave={handleSave}
        saving={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
}

// Individual task row
function TaskRow({
  task, assigneeName, stageName, onComplete, onEdit, onDelete,
}: {
  task: VehicleTask;
  assigneeName: string | null | undefined;
  stageName?: string;
  onComplete?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && !["completed", "canceled"].includes(task.status);
  const isDone = task.status === "completed" || task.status === "canceled";

  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group">
      {/* Quick complete checkbox */}
      {!isDone && onComplete && (
        <div className="pt-0.5">
          <Checkbox
            checked={false}
            onCheckedChange={() => onComplete()}
            className="h-4 w-4"
          />
        </div>
      )}
      {isDone && (
        <div className="pt-0.5">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )}

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>
            {task.title}
          </span>
          {statusIcons[task.status]}
          <Badge variant="outline" className={cn("text-[10px] px-1.5", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
          {task.is_blocked && (
            <Badge variant="destructive" className="text-[10px] px-1.5">Blocked</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{task.task_type}</span>
          {assigneeName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {assigneeName}
            </span>
          )}
          {task.due_at && (
            <span className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
              <Calendar className="h-3 w-3" />
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
              {format(new Date(task.due_at), "MMM d")}
            </span>
          )}
          {stageName && <span>Stage: {stageName}</span>}
          {task.is_blocked && task.blocker_reason && (
            <span className="text-destructive">⊘ {task.blocker_reason}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          {!isDone && onComplete && (
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle className="h-3.5 w-3.5 mr-2" /> Complete
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
