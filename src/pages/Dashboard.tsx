import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import { Car, Clock, CheckCircle, AlertTriangle, DollarSign, Timer, ShieldAlert, Package } from "lucide-react";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time recon performance overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Vehicles in Recon" value={0} icon={<Car className="h-5 w-5" />} />
        <StatCard label="Avg Days in Recon" value="—" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Completed Today" value={0} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Avg Recon Cost" value="—" icon={<DollarSign className="h-5 w-5" />} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Overdue Vehicles" value={0} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Awaiting Approval" value={0} icon={<ShieldAlert className="h-5 w-5" />} />
        <StatCard label="Waiting on Parts" value={0} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Avg Time to Line" value="—" icon={<Timer className="h-5 w-5" />} />
      </div>

      {/* Attention Needed */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Needs Attention</h2>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12">
          <p className="text-sm text-muted-foreground">No vehicles require attention</p>
        </div>
      </div>
    </AppLayout>
  );
}
