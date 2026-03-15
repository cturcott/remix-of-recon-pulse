import { useState, useMemo } from "react";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDate } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, TrendingDown, CheckCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TimeToFLRReport() {
  const { vehicles, stages, stageHistory, isLoading } = useReportData();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Completed vehicles = status "completed" or vehicles that reached the completion stage
  const completionStageIds = useMemo(() => stages.filter((s) => s.is_completion_stage).map((s) => s.id), [stages]);

  const completedVehicles = useMemo(() => {
    const now = Date.now();
    const rangeMs = dateRange === "7d" ? 7 * 86400000 : dateRange === "30d" ? 30 * 86400000 : dateRange === "90d" ? 90 * 86400000 : Infinity;
    
    return vehicles
      .filter((v) => v.status === "completed" || completionStageIds.includes(v.current_stage_id ?? ""))
      .filter((v) => {
        if (rangeMs === Infinity) return true;
        return (now - new Date(v.updated_at).getTime()) < rangeMs;
      })
      .map((v) => {
        // Find the FLR completion timestamp from stage history
        const flrEntry = stageHistory.find(
          (h) => h.vehicle_id === v.id && completionStageIds.includes(h.to_stage_id)
        );
        const flrTime = flrEntry
          ? (new Date(flrEntry.changed_at).getTime() - new Date(v.created_at).getTime()) / 86400000
          : (new Date(v.updated_at).getTime() - new Date(v.created_at).getTime()) / 86400000;
        return { ...v, flrDays: flrTime, completedAt: flrEntry?.changed_at ?? v.updated_at };
      })
      .filter((v) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return v.vin.toLowerCase().includes(q) || v.stock_number?.toLowerCase().includes(q) ||
          `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [vehicles, completionStageIds, stageHistory, dateRange, searchQuery]);

  const flrTimes = completedVehicles.map((v) => v.flrDays);
  const avgFlr = flrTimes.length > 0 ? flrTimes.reduce((s, t) => s + t, 0) / flrTimes.length : 0;
  const medianFlr = flrTimes.length > 0 ? [...flrTimes].sort((a, b) => a - b)[Math.floor(flrTimes.length / 2)] : 0;
  const fastestFlr = flrTimes.length > 0 ? Math.min(...flrTimes) : 0;
  const slowestFlr = flrTimes.length > 0 ? Math.max(...flrTimes) : 0;

  // SLA buckets
  const within24h = flrTimes.filter((t) => t <= 1).length;
  const within48h = flrTimes.filter((t) => t <= 2).length;
  const within72h = flrTimes.filter((t) => t <= 3).length;
  const pctWithin3d = flrTimes.length > 0 ? Math.round((within72h / flrTimes.length) * 100) : 0;

  const exportData = completedVehicles.map((v) => ({
    "Stock #": v.stock_number ?? "", VIN: v.vin, Year: v.year ?? "", Make: v.make ?? "",
    Model: v.model ?? "", "FLR Time (days)": Math.round(v.flrDays * 10) / 10,
    "Intake Date": formatDate(v.created_at), "Completed": formatDate(v.completedAt),
    Source: v.acquisition_source ?? "",
  }));

  const buckets = [
    { label: "< 24h", count: within24h, pct: flrTimes.length > 0 ? Math.round((within24h / flrTimes.length) * 100) : 0 },
    { label: "24-48h", count: within48h - within24h, pct: flrTimes.length > 0 ? Math.round(((within48h - within24h) / flrTimes.length) * 100) : 0 },
    { label: "48-72h", count: within72h - within48h, pct: flrTimes.length > 0 ? Math.round(((within72h - within48h) / flrTimes.length) * 100) : 0 },
    { label: "> 72h", count: flrTimes.length - within72h, pct: flrTimes.length > 0 ? Math.round(((flrTimes.length - within72h) / flrTimes.length) * 100) : 0 },
  ];

  return (
    <ReportLayout
      title="Time-to-Front-Line-Ready"
      description="Measure recon speed and completion performance over time"
      reportType="flr"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={{ dateRange }}
      sort={{}}
      onApplyView={(f) => { if (f.dateRange) setDateRange(f.dateRange); }}
      exportData={exportData}
      exportFilename="time-to-flr-report"
      totalCount={completedVehicles.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Avg FLR Time" value={formatDays(avgFlr)} icon={<Timer className="h-3.5 w-3.5" />} />
          <KpiCard label="Median FLR" value={formatDays(medianFlr)} icon={<TrendingDown className="h-3.5 w-3.5" />} />
          <KpiCard label="Completed" value={completedVehicles.length} icon={<CheckCircle className="h-3.5 w-3.5" />} variant="success" />
          <KpiCard label="Within 3 Days" value={`${pctWithin3d}%`} icon={<Target className="h-3.5 w-3.5" />} variant={pctWithin3d >= 70 ? "success" : "warning"} />
        </div>
      }
      filterBar={
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* SLA Buckets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {buckets.map((b) => (
              <Card key={b.label}>
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{b.label}</div>
                  <div className="text-2xl font-bold text-foreground">{b.count}</div>
                  <div className="text-xs text-muted-foreground">{b.pct}%</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {completedVehicles.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{v.year} {v.make} {v.model}</span>
                    <Badge variant="secondary" className="text-xs">{formatDays(v.flrDays)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>Stock: {v.stock_number ?? "—"}</span>
                    <span>Source: {v.acquisition_source ?? "—"}</span>
                    <span>Intake: {formatDate(v.created_at)}</span>
                    <span>Done: {formatDate(v.completedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">FLR Time</TableHead>
                  <TableHead>Intake Date</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedVehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.stock_number ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{v.year} {v.make} {v.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{v.vin}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatDays(v.flrDays)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.completedAt)}</TableCell>
                    <TableCell className="text-xs">{v.acquisition_source ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {completedVehicles.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No completed vehicles in this period</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}
