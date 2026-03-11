import { Vehicle } from "@/data/mockData";
import { Clock, AlertTriangle, DollarSign, User } from "lucide-react";

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-status-danger",
  high: "bg-status-warning",
  normal: "bg-primary",
  low: "bg-muted-foreground",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-status-active/15 text-status-active" },
  waiting: { label: "Waiting", className: "bg-status-warning/15 text-status-warning" },
  blocked: { label: "Blocked", className: "bg-status-danger/15 text-status-danger" },
  completed: { label: "Completed", className: "bg-status-success/15 text-status-success" },
};

export default function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const status = statusLabels[vehicle.currentStatus];

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`status-dot ${priorityColors[vehicle.priority]}`} />
          <span className="text-xs font-mono font-medium text-muted-foreground">#{vehicle.stockNumber}</span>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Vehicle Info */}
      <h4 className="text-sm font-semibold text-card-foreground mb-1">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </h4>
      <p className="text-xs text-muted-foreground mb-3">{vehicle.trim} · {vehicle.mileage.toLocaleString()} mi</p>

      {/* Meta */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{vehicle.daysInRecon}d in recon</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>${vehicle.totalReconCost.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{vehicle.assignedTo}</span>
        </div>
      </div>

      {/* Blocker */}
      {vehicle.blockers && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-status-danger/10 p-2 text-xs text-status-danger">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{vehicle.blockers}</span>
        </div>
      )}
    </div>
  );
}
