import { RECON_STAGES, mockVehicles } from "@/data/mockData";
import VehicleCard from "@/components/VehicleCard";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";

export default function CommandCenter() {
  const navigate = useNavigate();
  const stageVehicles = RECON_STAGES.map((stage) => ({
    stage,
    vehicles: mockVehicles.filter((v) => v.currentStage === stage),
  }));

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Drag vehicles across stages to update progress</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 160px)" }}>
        {stageVehicles.map(({ stage, vehicles }) => (
          <div key={stage} className="flex-shrink-0 w-72">
            {/* Column Header */}
            <div className="flex items-center justify-between rounded-t-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-card-foreground">{stage}</h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                  {vehicles.length}
                </span>
              </div>
            </div>

            {/* Column Body */}
            <div className="space-y-3 rounded-b-xl border border-t-0 border-border bg-muted/30 p-3 min-h-[200px]">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                />
              ))}
              {vehicles.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No vehicles</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
