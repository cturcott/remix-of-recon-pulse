import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import { dashboardStats, mockVehicles } from "@/data/mockData";
import { Car, Clock, CheckCircle, AlertTriangle, DollarSign, Timer, ShieldAlert, Package } from "lucide-react";
import VehicleCard from "@/components/VehicleCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const urgentVehicles = mockVehicles.filter(
    (v) => v.priority === "urgent" || v.currentStatus === "blocked" || v.daysInRecon > 8
  );

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time recon performance overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Vehicles in Recon"
          value={dashboardStats.totalInRecon}
          icon={<Car className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Days in Recon"
          value={dashboardStats.avgDaysInRecon}
          change="↓ 0.8 from last week"
          changeType="positive"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Completed Today"
          value={dashboardStats.completedToday}
          change="↑ 1 from yesterday"
          changeType="positive"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Recon Cost"
          value={`$${dashboardStats.avgReconCost.toLocaleString()}`}
          change="↓ $120 from last month"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Overdue Vehicles"
          value={dashboardStats.overdueVehicles}
          icon={<AlertTriangle className="h-5 w-5" />}
          changeType="negative"
          change="2 past target date"
        />
        <StatCard
          label="Awaiting Approval"
          value={dashboardStats.waitingApproval}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Waiting on Parts"
          value={dashboardStats.waitingParts}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Avg Time to Line"
          value={`${dashboardStats.avgTimeToLine}d`}
          change="↓ 1.1d improvement"
          changeType="positive"
          icon={<Timer className="h-5 w-5" />}
        />
      </div>

      {/* Attention Needed */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Needs Attention</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {urgentVehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicle/${v.id}`)} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
