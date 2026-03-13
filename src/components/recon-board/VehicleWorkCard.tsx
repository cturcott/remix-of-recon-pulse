import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Car, Clock, ChevronRight, User, MessageSquare, AlertTriangle,
  ExternalLink, Timer, ChevronsRight, Lock,
} from "lucide-react";

interface VehicleWorkCardProps {
  vehicle: {
    id: string;
    vin: string;
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    mileage: number;
    stock_number: string | null;
    exterior_color: string | null;
    created_at: string;
    assigned_to: string | null;
    notes: string | null;
  };
  nextStageName: string | null;
  assigneeName: string | null;
  notesCount: number;
  isSelected: boolean;
  canMove: boolean;
  isAdmin: boolean;
  allStages?: { id: string; name: string; sort_order: number }[];
  currentStageId?: string | null;
  onSelect: () => void;
  onMoveNext: () => void;
  onMoveToStage?: (stageId: string) => void;
  onViewDetail: () => void;
}

function getStageAge(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function getAgingStatus(createdAt: string): "ok" | "warning" | "danger" {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hours > 240) return "danger";
  if (hours > 120) return "warning";
  return "ok";
}

export default function VehicleWorkCard({
  vehicle,
  nextStageName,
  assigneeName,
  notesCount,
  isSelected,
  canMove,
  isAdmin,
  allStages = [],
  currentStageId,
  onSelect,
  onMoveNext,
  onMoveToStage,
  onViewDetail,
}: VehicleWorkCardProps) {
  const agingStatus = getAgingStatus(vehicle.created_at);
  const stageAge = getStageAge(vehicle.created_at);

  // For admin "move to any stage" dropdown, exclude the current stage
  const otherStages = allStages.filter((s) => s.id !== currentStageId);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-3.5 cursor-pointer transition-all",
        isSelected
          ? "border-primary ring-1 ring-primary/30 shadow-md"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      )}
    >
      {/* Top row: vehicle name + age badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-foreground leading-tight">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] shrink-0 gap-0.5",
            agingStatus === "danger" && "border-destructive/50 text-destructive bg-destructive/10",
            agingStatus === "warning" && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10 dark:text-yellow-400"
          )}
        >
          <Timer className="h-3 w-3" />
          {stageAge}
        </Badge>
      </div>

      {/* Trim */}
      {vehicle.trim && (
        <p className="text-xs text-muted-foreground mb-2">{vehicle.trim}</p>
      )}

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="font-mono font-medium">
          {vehicle.stock_number || `...${vehicle.vin.slice(-6)}`}
        </span>
        <span>{vehicle.mileage.toLocaleString()} mi</span>
        {vehicle.exterior_color && <span>{vehicle.exterior_color}</span>}
      </div>

      {/* Assignment + meta */}
      <div className="flex items-center gap-3 mb-3">
        {assigneeName ? (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3 w-3" />
            </div>
            <span className="font-medium truncate max-w-[120px]">{assigneeName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
              <User className="h-3 w-3" />
            </div>
            <span className="italic">Unassigned</span>
          </div>
        )}

        {notesCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{notesCount}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {nextStageName && canMove && (
          <Button
            size="sm"
            className="h-7 text-xs flex-1 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onMoveNext();
            }}
          >
            Send to {nextStageName}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}

        {nextStageName && !canMove && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
            <Lock className="h-3 w-3" />
            <span>Not assigned to move</span>
          </div>
        )}

        {/* Admin: move to any stage */}
        {isAdmin && otherStages.length > 0 && onMoveToStage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {otherStages.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => onMoveToStage(s.id)}
                  className="text-xs"
                >
                  Move to {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
