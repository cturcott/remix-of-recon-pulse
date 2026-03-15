import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface ReportFiltersProps {
  stages: FilterOption[];
  assignees: FilterOption[];
  selectedStage: string;
  onStageChange: (v: string) => void;
  selectedAssignee: string;
  onAssigneeChange: (v: string) => void;
  selectedSlaStatus: string;
  onSlaStatusChange: (v: string) => void;
  onClearAll: () => void;
  extraFilters?: React.ReactNode;
}

export default function ReportFilters({
  stages, assignees,
  selectedStage, onStageChange,
  selectedAssignee, onAssigneeChange,
  selectedSlaStatus, onSlaStatusChange,
  onClearAll, extraFilters,
}: ReportFiltersProps) {
  const hasFilters = selectedStage !== "all" || selectedAssignee !== "all" || selectedSlaStatus !== "all";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedStage} onValueChange={onStageChange}>
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="All Stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="All Assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {assignees.map((a) => (
            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedSlaStatus} onValueChange={onSlaStatusChange}>
        <SelectTrigger className="h-9 w-[140px] text-xs">
          <SelectValue placeholder="SLA Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="on_track">On Track</SelectItem>
        </SelectContent>
      </Select>

      {extraFilters}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-9 gap-1 text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
