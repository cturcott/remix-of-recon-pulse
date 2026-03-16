import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import AppLayout from "@/components/AppLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays } from "@/lib/reportExport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Car, Clock, AlertTriangle, Layers, Timer, AlertCircle, ArrowRight,
  CheckCircle, UserX, PauseCircle, RotateCcw, Target, XCircle, TrendingDown,
  Gavel, Package, TrendingUp, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsDashboard() {
  const { vehicles, stages, stageHistory, repairItems, isLoading, profileMap } = useReportData();

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === "in_recon"), [vehicles]);
  const completedVehicles = useMemo(() => vehicles.filter((v) => v.status === "completed" || stages.some((s) => s.is_completion_stage && s.id === v.current_stage_id)), [vehicles, stages]);

  // ── Aging KPIs ──
  const totalInRecon = activeVehicles.length;
  const avgReconAge = totalInRecon > 0
    ? Math.round(activeVehicles.reduce((s, v) => s + (v.totalReconAge ?? 0), 0) / totalInRecon)
    : 0;
  const overdueCount = activeVehicles.filter((v) => v.slaStatus === "overdue").length;
  const oldestAge = totalInRecon > 0 ? Math.round(Math.max(...activeVehicles.map((v) => v.totalReconAge ?? 0))) : 0;

  // ── Bottleneck KPIs ──
  const stageStats = useMemo(() => {
    return stages.map((stage) => {
      const sv = activeVehicles.filter((v) => v.current_stage_id === stage.id);
      return { id: stage.id, name: stage.name, count: sv.length, overdueCount: sv.filter((v) => v.slaStatus === "overdue").length };
    }).sort((a, b) => b.count - a.count);
  }, [stages, activeVehicles]);
  const topBottleneck = stageStats[0];
  const maxWip = Math.max(...stageStats.map((s) => s.count), 1);

  // ── WIP KPIs ──
  const pendingApprovals = useMemo(() => {
    const set = new Set<string>();
    repairItems.filter((r) => r.status === "pending").forEach((r) => set.add(r.vehicle_id));
    return set.size;
  }, [repairItems]);
  const unassigned = activeVehicles.filter((v) => !v.assigned_to).length;

  // ── FLR KPIs ──
  const completionStageIds = stages.filter((s) => s.is_completion_stage).map((s) => s.id);
  const recentCompleted = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return completedVehicles.filter((v) => new Date(v.updated_at).getTime() > cutoff);
  }, [completedVehicles]);
  const flrTimes = recentCompleted.map((v) => v.totalReconAge ?? 0);
  const avgFlr = flrTimes.length > 0 ? Math.round(flrTimes.reduce((s, t) => s + t, 0) / flrTimes.length) : 0;
  const within3d = flrTimes.length > 0 ? Math.round((flrTimes.filter((t) => t <= 3).length / flrTimes.length) * 100) : 0;

  // ── Exception KPIs ──
  const noActivityDays = 2;
  const now = Date.now();
  const stageOrderMap = new Map(stages.map((s) => [s.id, s.sort_order]));
  const reworkIds = useMemo(() => {
    const ids = new Set<string>();
    const byVehicle = new Map<string, typeof stageHistory>();
    stageHistory.forEach((h) => {
      if (!byVehicle.has(h.vehicle_id)) byVehicle.set(h.vehicle_id, []);
      byVehicle.get(h.vehicle_id)!.push(h);
    });
    byVehicle.forEach((hist, vid) => {
      hist.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
      for (let i = 1; i < hist.length; i++) {
        const from = hist[i].from_stage_id ? stageOrderMap.get(hist[i].from_stage_id!) ?? 0 : 0;
        const to = stageOrderMap.get(hist[i].to_stage_id) ?? 0;
        if (to < from) { ids.add(vid); break; }
      }
    });
    return ids;
  }, [stageHistory, stageOrderMap]);

  let criticalExceptions = 0;
  activeVehicles.forEach((v) => {
    if (v.slaStatus === "overdue" && (v.stageAge ?? 0) - (stages.find((s) => s.id === v.current_stage_id)?.sla_days ?? 5) > 3) criticalExceptions++;
    if ((v.totalReconAge ?? 0) > 14) criticalExceptions++;
    if ((now - new Date(v.updated_at).getTime()) / 86400000 > 5) criticalExceptions++;
  });

  const totalExceptions = overdueCount + unassigned + reworkIds.size + pendingApprovals +
    activeVehicles.filter((v) => (now - new Date(v.updated_at).getTime()) / 86400000 > noActivityDays).length;

  const reportCards = [
    {
      title: "Recon Aging",
      description: "Track vehicle aging and identify units sitting too long",
      path: "/reports/aging",
      icon: Clock,
      color: "text-primary",
      metrics: [
        { label: "In Recon", value: totalInRecon },
        { label: "Avg Age", value: `${avgReconAge}d` },
        { label: "Overdue", value: overdueCount, variant: overdueCount > 0 ? "danger" as const : undefined },
        { label: "Oldest", value: `${oldestAge}d` },
      ],
    },
    {
      title: "Stage Bottleneck",
      description: "Find where the pipeline is slowing down",
      path: "/reports/bottleneck",
      icon: Layers,
      color: "text-purple-500",
      metrics: [
        { label: "Top Stage", value: topBottleneck?.name ?? "—" },
        { label: "Units", value: topBottleneck?.count ?? 0 },
        { label: "Stages Overdue", value: stageStats.filter((s) => s.overdueCount > 0).length, variant: stageStats.filter((s) => s.overdueCount > 0).length > 0 ? "danger" as const : undefined },
      ],
    },
    {
      title: "WIP Queue",
      description: "Live view of all vehicles currently in recon",
      path: "/reports/wip",
      icon: Car,
      color: "text-blue-500",
      metrics: [
        { label: "Total WIP", value: totalInRecon },
        { label: "Awaiting Approval", value: pendingApprovals, variant: pendingApprovals > 0 ? "warning" as const : undefined },
        { label: "Unassigned", value: unassigned, variant: unassigned > 0 ? "warning" as const : undefined },
      ],
    },
    {
      title: "Time to Front-Line Ready",
      description: "Measure recon speed and completion performance",
      path: "/reports/flr",
      icon: Timer,
      color: "text-green-500",
      metrics: [
        { label: "Avg FLR", value: `${avgFlr}d` },
        { label: "Completed (30d)", value: recentCompleted.length },
        { label: "Within 3 Days", value: `${within3d}%`, variant: within3d >= 70 ? "success" as const : "warning" as const },
      ],
    },
    {
      title: "Exceptions",
      description: "Surface vehicles that need immediate attention",
      path: "/reports/exceptions",
      icon: AlertCircle,
      color: "text-destructive",
      metrics: [
        { label: "Total", value: totalExceptions },
        { label: "Critical", value: criticalExceptions, variant: criticalExceptions > 0 ? "danger" as const : undefined },
        { label: "No Assignee", value: unassigned, variant: unassigned > 0 ? "warning" as const : undefined },
      ],
    },
    {
      title: "Approval Lag",
      description: "Identify delays caused by vehicles waiting for approval",
      path: "/reports/approval-lag",
      icon: Gavel,
      color: "text-orange-500",
      metrics: [
        { label: "Pending", value: pendingApprovals, variant: pendingApprovals > 0 ? "warning" as const : undefined },
      ],
    },
    {
      title: "Parts Hold / Sublet",
      description: "Track parts and sublet delays slowing recon",
      path: "/reports/parts-hold",
      icon: Package,
      color: "text-amber-600",
      metrics: [
        { label: "Active Holds", value: repairItems.filter((r) => (r.status === "pending" || r.status === "in_progress") && ["parts","tires","glass","wheels","sublet"].includes((r.category ?? "").toLowerCase())).length },
      ],
    },
    {
      title: "FLR Output",
      description: "Measure production throughput to front-line ready",
      path: "/reports/flr-output",
      icon: TrendingUp,
      color: "text-emerald-500",
      metrics: [
        { label: "Completed (30d)", value: recentCompleted.length, variant: "success" as const },
      ],
    },
    {
      title: "Recon Cost",
      description: "Analyze recon spending by vehicle, category and vendor",
      path: "/reports/recon-cost",
      icon: DollarSign,
      color: "text-sky-500",
      metrics: [
        { label: "Vehicles w/ Cost", value: new Set(repairItems.map((r) => r.vehicle_id)).size },
      ],
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational reporting for recon performance management</p>
        </div>

        {/* Top-level KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="In Recon" value={totalInRecon} icon={<Car className="h-3.5 w-3.5" />} />
          <KpiCard label="Avg Recon Age" value={`${avgReconAge}d`} icon={<Clock className="h-3.5 w-3.5" />} />
          <KpiCard label="Overdue" value={overdueCount} variant={overdueCount > 0 ? "danger" : "default"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <KpiCard label="Avg FLR Time" value={`${avgFlr}d`} icon={<Timer className="h-3.5 w-3.5" />} />
          <KpiCard label="Exceptions" value={totalExceptions} variant={criticalExceptions > 0 ? "danger" : totalExceptions > 0 ? "warning" : "default"} icon={<AlertCircle className="h-3.5 w-3.5" />} />
          <KpiCard label="Unassigned" value={unassigned} variant={unassigned > 0 ? "warning" : "default"} icon={<UserX className="h-3.5 w-3.5" />} />
        </div>

        {/* Stage distribution mini-chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stageStats.filter((s) => s.count > 0 || true).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-[140px] sm:w-[200px] truncate">{s.name}</span>
                <div className="flex-1">
                  <Progress value={(s.count / maxWip) * 100} className="h-2" />
                </div>
                <div className="flex items-center gap-2 w-[80px] justify-end">
                  <span className="text-xs font-medium">{s.count}</span>
                  {s.overdueCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">{s.overdueCount}</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Report cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((report) => (
            <Link key={report.path} to={report.path} className="group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md group-hover:bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <report.icon className={cn("h-5 w-5", report.color)} />
                    <CardTitle className="text-base">{report.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {report.metrics.map((m) => (
                      <div key={m.label} className="text-center min-w-[60px]">
                        <div className={cn(
                          "text-lg font-bold",
                          m.variant === "danger" && "text-destructive",
                          m.variant === "warning" && "text-yellow-600",
                          m.variant === "success" && "text-green-600",
                          !m.variant && "text-foreground",
                        )}>{m.value}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View full report <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
