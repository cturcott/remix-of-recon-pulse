import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StageWithCounts {
  id: string;
  name: string;
  sort_order: number;
  is_start_stage: boolean;
  is_completion_stage: boolean;
  vehicleCount: number;
  warningCount: number;
  dangerCount: number;
}

interface StageQueueSidebarProps {
  stages: StageWithCounts[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  totalInRecon: number;
}

export default function StageQueueSidebar({
  stages,
  selectedStageId,
  onSelectStage,
  totalInRecon,
}: StageQueueSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card shrink-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Workflow Queue
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalInRecon} vehicle{totalInRecon !== 1 ? "s" : ""} in recon
        </p>
      </div>

      {/* Stage list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {stages.map((stage) => {
            const isActive = selectedStageId === stage.id;
            const hasWarnings = stage.warningCount > 0;
            const hasDangers = stage.dangerCount > 0;

            return (
              <button
                key={stage.id}
                onClick={() => onSelectStage(stage.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50 border-l-2 border-transparent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm truncate",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {stage.name}
                  </p>
                </div>

                {/* Count badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasDangers && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1 text-[10px] font-bold text-destructive">
                      {stage.dangerCount}
                    </span>
                  )}
                  {hasWarnings && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500/15 px-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                      {stage.warningCount}
                    </span>
                  )}
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {stage.vehicleCount}
                  </span>
                </div>

                <ChevronRight className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  isActive ? "text-primary" : "text-muted-foreground/50"
                )} />
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
