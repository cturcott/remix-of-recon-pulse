import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDate } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Layers, AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageStats {
  id: string;
  name: string;
  sortOrder: number;
  wipCount: number;
  avgAge: number;
  medianAge: number;
  longestAge: number;
  overdueCount: number;
  warningCount: number;
  reworkCount: number;
}

export default function StageBottleneckReport() {
  const navigate = useNavigate();
  const { vehicles, stages, stageHistory, isLoading } = useReportData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === "in_recon"), [vehicles]);

  // Count reworks (vehicles moved backward)
  const reworkCounts = useMemo(() => {
    const stageOrderMap = new Map(stages.map((s) => [s.id, s.sort_order]));
    const counts: Record<string, number> = {};
    const vehicleHistories = new Map<string, typeof stageHistory>();
    stageHistory.forEach((h) => {
      if (!vehicleHistories.has(h.vehicle_id)) vehicleHistories.set(h.vehicle_id, []);
      vehicleHistories.get(h.vehicle_id)!.push(h);
    });
    vehicleHistories.forEach((history) => {
      history.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
      for (let i = 1; i < history.length; i++) {
        const fromOrder = history[i].from_stage_id ? stageOrderMap.get(history[i].from_stage_id!) ?? 0 : 0;
        const toOrder = stageOrderMap.get(history[i].to_stage_id) ?? 0;
        if (toOrder < fromOrder) {
          counts[history[i].to_stage_id] = (counts[history[i].to_stage_id] || 0) + 1;
        }
      }
    });
    return counts;
  }, [stageHistory, stages]);

  const stageStats: StageStats[] = useMemo(() => {
    return stages.map((stage) => {
      const stageVehicles = activeVehicles.filter((v) => v.current_stage_id === stage.id);
      const ages = stageVehicles.map((v) => v.stageAge ?? 0).sort((a, b) => a - b);
      const avg = ages.length > 0 ? ages.reduce((s, a) => s + a, 0) / ages.length : 0;
      const median = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : 0;
      const longest = ages.length > 0 ? ages[ages.length - 1] : 0;

      return {
        id: stage.id,
        name: stage.name,
        sortOrder: stage.sort_order,
        wipCount: stageVehicles.length,
        avgAge: avg,
        medianAge: median,
        longestAge: longest,
        overdueCount: stageVehicles.filter((v) => v.slaStatus === "overdue").length,
        warningCount: stageVehicles.filter((v) => v.slaStatus === "warning").length,
        reworkCount: reworkCounts[stage.id] || 0,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [stages, activeVehicles, reworkCounts]);

  const topBottleneck = stageStats.reduce((max, s) => s.wipCount > max.wipCount ? s : max, stageStats[0]);
  const totalOverdue = stageStats.reduce((s, st) => s + st.overdueCount, 0);
  const maxWip = Math.max(...stageStats.map((s) => s.wipCount), 1);

  const expandedVehicles = expandedStage
    ? activeVehicles
        .filter((v) => v.current_stage_id === expandedStage)
        .filter((v) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return v.vin.toLowerCase().includes(q) || v.stock_number?.toLowerCase().includes(q) ||
            `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q);
        })
        .sort((a, b) => (b.stageAge ?? 0) - (a.stageAge ?? 0))
    : [];

  const exportData = stageStats.map((s) => ({
    Stage: s.name, "WIP Count": s.wipCount, "Avg Age (days)": Math.round(s.avgAge),
    "Median Age (days)": Math.round(s.medianAge), "Longest (days)": Math.round(s.longestAge),
    "Overdue": s.overdueCount, "Warning": s.warningCount, "Rework": s.reworkCount,
  }));

  return (
    <ReportLayout
      title="Stage Bottleneck Report"
      description="Identify which workflow stages are slowing down the recon pipeline"
      reportType="bottleneck"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={{}}
      sort={{}}
      onApplyView={() => {}}
      exportData={exportData}
      exportFilename="stage-bottleneck-report"
      kpiBar={
        stageStats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Top Bottleneck" value={topBottleneck?.name ?? "—"} subValue={`${topBottleneck?.wipCount ?? 0} units`} icon={<Layers className="h-3.5 w-3.5" />} />
            <KpiCard label="Total WIP" value={activeVehicles.length} />
            <KpiCard label="Total Overdue" value={totalOverdue} variant={totalOverdue > 0 ? "danger" : "default"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <KpiCard label="Total Reworks" value={Object.values(reworkCounts).reduce((s, c) => s + c, 0)} variant="warning" icon={<RotateCcw className="h-3.5 w-3.5" />} />
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Stage summary cards - mobile */}
          <div className="sm:hidden space-y-3">
            {stageStats.map((s) => (
              <Card key={s.id} className={cn("cursor-pointer transition-colors", expandedStage === s.id && "border-primary")} onClick={() => setExpandedStage(expandedStage === s.id ? null : s.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{s.name}</span>
                    <Badge variant="secondary">{s.wipCount} units</Badge>
                  </div>
                  <Progress value={(s.wipCount / maxWip) * 100} className="h-2 mb-2" />
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Avg: {formatDays(s.avgAge)}</span>
                    <span className="text-destructive">{s.overdueCount} overdue</span>
                    <span>{s.reworkCount} rework</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stage summary table - desktop */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">WIP</TableHead>
                  <TableHead className="w-[120px]">Distribution</TableHead>
                  <TableHead className="text-right">Avg Age</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Longest</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Warning</TableHead>
                  <TableHead className="text-right">Rework</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stageStats.map((s) => (
                  <TableRow key={s.id} className={cn("cursor-pointer hover:bg-muted/50", expandedStage === s.id && "bg-accent")} onClick={() => setExpandedStage(expandedStage === s.id ? null : s.id)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right font-bold">{s.wipCount}</TableCell>
                    <TableCell><Progress value={(s.wipCount / maxWip) * 100} className="h-2" /></TableCell>
                    <TableCell className="text-right">{formatDays(s.avgAge)}</TableCell>
                    <TableCell className="text-right">{formatDays(s.medianAge)}</TableCell>
                    <TableCell className="text-right">{formatDays(s.longestAge)}</TableCell>
                    <TableCell className="text-right">{s.overdueCount > 0 ? <span className="text-destructive font-medium">{s.overdueCount}</span> : "0"}</TableCell>
                    <TableCell className="text-right">{s.warningCount > 0 ? <span className="text-yellow-600 font-medium">{s.warningCount}</span> : "0"}</TableCell>
                    <TableCell className="text-right">{s.reworkCount > 0 ? <span className="font-medium">{s.reworkCount}</span> : "0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Expanded drilldown */}
          {expandedStage && expandedVehicles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Vehicles in {stageStats.find((s) => s.id === expandedStage)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stock #</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Stage Age</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expandedVehicles.map((v) => (
                        <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${v.id}`)}>
                          <TableCell className="font-mono text-xs">{v.stock_number ?? "—"}</TableCell>
                          <TableCell className="text-sm">{v.year} {v.make} {v.model}</TableCell>
                          <TableCell className="text-right font-medium">{formatDays(v.stageAge)}</TableCell>
                          <TableCell className="text-sm">{v.assigneeName ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={v.slaStatus === "overdue" ? "destructive" : v.slaStatus === "warning" ? "outline" : "secondary"}>
                              {v.slaStatus === "overdue" ? "Overdue" : v.slaStatus === "warning" ? "Warning" : "On Track"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </ReportLayout>
  );
}
