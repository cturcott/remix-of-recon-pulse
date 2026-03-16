import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES, BLOCKER_REASONS,
  type VehicleTask, type CreateTaskInput, type UpdateTaskInput,
  type TaskStatus, type TaskPriority,
} from "@/hooks/useVehicleTasks";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: VehicleTask | null;
  vehicleId: string;
  stages?: { id: string; name: string }[];
  teamMembers?: { user_id: string; name: string }[];
  onSave: (input: CreateTaskInput | UpdateTaskInput) => void;
  saving?: boolean;
}

export default function TaskDialog({
  open, onOpenChange, task, vehicleId, stages = [], teamMembers = [], onSave, saving,
}: TaskDialogProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [taskType, setTaskType] = useState(task?.task_type ?? "Miscellaneous");
  const [linkedStageId, setLinkedStageId] = useState(task?.linked_stage_id ?? "none");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "not_started");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [assignee, setAssignee] = useState(task?.assignee_user_id ?? "none");
  const [dueDate, setDueDate] = useState<Date | undefined>(task?.due_at ? new Date(task.due_at) : undefined);
  const [isBlocked, setIsBlocked] = useState(task?.is_blocked ?? false);
  const [blockerReason, setBlockerReason] = useState(task?.blocker_reason ?? "");
  const [blockerNote, setBlockerNote] = useState(task?.blocker_note ?? "");

  // Reset form when dialog opens with a different task
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setTaskType(task?.task_type ?? "Miscellaneous");
      setLinkedStageId(task?.linked_stage_id ?? "none");
      setStatus(task?.status ?? "not_started");
      setPriority(task?.priority ?? "normal");
      setAssignee(task?.assignee_user_id ?? "none");
      setDueDate(task?.due_at ? new Date(task.due_at) : undefined);
      setIsBlocked(task?.is_blocked ?? false);
      setBlockerReason(task?.blocker_reason ?? "");
      setBlockerNote(task?.blocker_note ?? "");
    }
    onOpenChange(val);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const effectiveStatus = isBlocked ? "blocked" : status;

    if (isEdit && task) {
      onSave({
        id: task.id,
        title: title.trim(),
        description: description || null,
        task_type: taskType,
        linked_stage_id: linkedStageId === "none" ? null : linkedStageId,
        status: effectiveStatus,
        priority,
        assignee_user_id: assignee === "none" ? null : assignee,
        due_at: dueDate ? dueDate.toISOString() : null,
        is_blocked: isBlocked,
        blocker_reason: isBlocked ? blockerReason || null : null,
        blocker_note: isBlocked ? blockerNote || null : null,
      } as UpdateTaskInput);
    } else {
      onSave({
        vehicle_id: vehicleId,
        title: title.trim(),
        description: description || undefined,
        task_type: taskType,
        linked_stage_id: linkedStageId === "none" ? null : linkedStageId,
        status: effectiveStatus,
        priority,
        assignee_user_id: assignee === "none" ? null : assignee,
        due_at: dueDate ? dueDate.toISOString() : null,
        is_blocked: isBlocked,
        blocker_reason: isBlocked ? blockerReason || null : null,
        blocker_note: isBlocked ? blockerNote || null : null,
      } as CreateTaskInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Replace windshield" className="text-[16px] sm:text-sm" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." rows={2} />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked Stage</Label>
              <Select value={linkedStageId} onValueChange={setLinkedStageId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  {dueDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDueDate(undefined)}>Clear date</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Blocked toggle */}
          <div className="flex items-center gap-3 py-2">
            <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
            <Label className="cursor-pointer" onClick={() => setIsBlocked(!isBlocked)}>Mark as Blocked</Label>
          </div>

          {isBlocked && (
            <div className="space-y-3 pl-4 border-l-2 border-destructive/30">
              <div className="space-y-1.5">
                <Label>Blocker Reason *</Label>
                <Select value={blockerReason || "placeholder"} onValueChange={setBlockerReason}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select reason</SelectItem>
                    {BLOCKER_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Blocker Note</Label>
                <Textarea value={blockerNote} onChange={(e) => setBlockerNote(e.target.value)} placeholder="Additional context..." rows={2} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving || (isBlocked && !blockerReason)}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
