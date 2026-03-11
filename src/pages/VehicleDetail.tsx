import { useParams, useNavigate } from "react-router-dom";
import { mockVehicles, RECON_STAGES } from "@/data/mockData";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Clock, DollarSign, User, Calendar, AlertTriangle, CheckCircle2, MapPin, Hash } from "lucide-react";

const stageStatusForVehicle = (vehicleStage: string) => {
  const idx = RECON_STAGES.indexOf(vehicleStage as any);
  return RECON_STAGES.map((stage, i) => ({
    stage,
    status: i < idx ? "completed" : i === idx ? "current" : "upcoming",
  }));
};

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicle = mockVehicles.find((v) => v.id === id);

  if (!vehicle) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Vehicle not found</p>
        </div>
      </AppLayout>
    );
  }

  const stages = stageStatusForVehicle(vehicle.currentStage);

  return (
    <AppLayout>
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          {/* Vehicle Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                <p className="text-muted-foreground">{vehicle.trim}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                vehicle.priority === "urgent" ? "bg-status-danger/15 text-status-danger" :
                vehicle.priority === "high" ? "bg-status-warning/15 text-status-warning" :
                "bg-primary/10 text-primary"
              }`}>
                {vehicle.priority.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem icon={<Hash className="h-4 w-4" />} label="Stock #" value={vehicle.stockNumber} />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="VIN" value={`...${vehicle.vin.slice(-8)}`} />
              <InfoItem icon={<Clock className="h-4 w-4" />} label="Mileage" value={`${vehicle.mileage.toLocaleString()} mi`} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Acquired" value={new Date(vehicle.acquisitionDate).toLocaleDateString()} />
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Recon Workflow</h2>
            <div className="space-y-0">
              {stages.map(({ stage, status }, i) => (
                <div key={stage} className="flex items-start gap-4">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      status === "completed" ? "border-status-success bg-status-success/15" :
                      status === "current" ? "border-primary bg-primary/15 animate-pulse-glow" :
                      "border-border bg-muted"
                    }`}>
                      {status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                      ) : status === "current" ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    {i < stages.length - 1 && (
                      <div className={`w-0.5 h-8 ${status === "completed" ? "bg-status-success/40" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-6">
                    <p className={`text-sm font-medium ${
                      status === "completed" ? "text-status-success" :
                      status === "current" ? "text-primary" :
                      "text-muted-foreground"
                    }`}>
                      {stage}
                    </p>
                    {status === "current" && vehicle.blockers && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-status-danger">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {vehicle.blockers}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Key Metrics */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-card-foreground">Key Metrics</h3>
            <MetricRow icon={<Clock className="h-4 w-4" />} label="Days in Recon" value={`${vehicle.daysInRecon}`} />
            <MetricRow icon={<DollarSign className="h-4 w-4" />} label="Recon Cost" value={`$${vehicle.totalReconCost.toLocaleString()}`} />
            <MetricRow icon={<User className="h-4 w-4" />} label="Assigned To" value={vehicle.assignedTo} />
            <MetricRow icon={<Calendar className="h-4 w-4" />} label="Target Frontline" value={new Date(vehicle.targetFrontlineDate).toLocaleDateString()} />
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <ActivityItem time="2h ago" text="Mike Torres updated mechanical status to In Progress" />
              <ActivityItem time="5h ago" text="Estimate submitted for $1,240 — awaiting approval" />
              <ActivityItem time="1d ago" text="Initial inspection completed by James Wright" />
              <ActivityItem time="2d ago" text="Vehicle added to recon pipeline" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="text-sm font-medium text-card-foreground">{value}</p>
    </div>
  );
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      <span className="text-sm font-semibold text-card-foreground">{value}</span>
    </div>
  );
}

function ActivityItem({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
        <div className="w-0.5 flex-1 bg-border" />
      </div>
      <div className="pb-4">
        <p className="text-xs text-muted-foreground">{time}</p>
        <p className="text-sm text-card-foreground">{text}</p>
      </div>
    </div>
  );
}
