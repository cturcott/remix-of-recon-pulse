import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilters from "@/components/reports/ReportFilters";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDateTime } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, AlertCircle, XCircle, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

type ExceptionType = "overdue_stage" | "overdue_total" | "no_assignee" | "no_activity" | "pending_approval" | "rework";

interface ExceptionVehicle {
  vehicleId: string;
  vin: string;
  stockNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  stageName: string;
  stageAge: number;
  totalReconAge: number;
  assigneeName: string | null;
  exceptionType: ExceptionType;
  severity: "warning" | "urgent" | "critical";
  detail: string;
  lastUpdate: string;
  currentStageId: string | null;
}

const EXCEPTION_LABELS: Record<ExceptionType, string> = {
  overdue_stage: "Overdue in Stage",
  overdue_total: "Overdue Total Age",
  no_assignee: "No Assignee",
  no_activity: "No Recent Activity",
  pending_approval: "Pending Approval",
  rework: "Rework / Moved Back",
};

const SEVERITY_ORDER = { critical: 0, urgent: 1, warning: 2 };

export default function ExceptionReport() {
  const navigate = useNavigate();
  const { vehicles, stages, stageHistory, repairItems, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedSlaStatus, setSelectedSlaStatus] = useState("all");
  const [selectedExceptionType, setSelectedExceptionType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === "in_recon"), [vehicles]);

  // Detect reworks
  const reworkVehicleIds = useMemo(() => {
    const stageOrderMap = new Map(stages.map((s) => [s.id, s.sort_order]));
    const ids = new Set<string>();
    const vehicleHistories = new Map<string, typeof stageHistory>();
    stageHistory.forEach((h) => {
      if (!vehicleHistories.has(h.vehicle_id)) vehicleHistories.set(h.vehicle_id, []);
      vehicleHistories.get(h.vehicle_id)!.push(h);
    });
    vehicleHistories.forEach((history, vehicleId) => {
      history.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
      for (let i = 1; i < history.length; i++) {
        const fromOrder = history[i].from_stage_id ? stageOrderMap.get(history[i].from_stage_id!) ?? 0 : 0;
        const toOrder = stageOrderMap.get(history[i].to_stage_id) ?? 0;
        if (toOrder < fromOrder) { ids.add(vehicleId); break; }
      }
    });
    return ids;
  }, [stageHistory, stages]);

  const pendingApprovals = useMemo(() => {
    const map: Record<string, number> = {};
    repairItems.filter((r) => r.status === "pending").forEach((r) => {
      map[r.vehicle_id] = (map[r.vehicle_id] || 0) + 1;
    });
    return map;
  }, [repairItems]);

  const exceptions: ExceptionVehicle[] = useMemo(() => {
    const result: ExceptionVehicle[] = [];
    const now = Date.now();
    const NO_ACTIVITY_DAYS = 2;

    activeVehicles.forEach((v) => {
      const base = {
        vehicleId: v.id, vin: v.vin, stockNumber: v.stock_number,
        year: v.year, make: v.make, model: v.model,
        stageName: v.stageName ?? "Unknown", stageAge: v.stageAge ?? 0,
        totalReconAge: v.totalReconAge ?? 0, assigneeName: v.assigneeName ?? null,
        lastUpdate: v.updated_at, currentStageId: v.current_stage_id,
      };

      // Overdue in stage
      if (v.slaStatus === "overdue") {
        const overdueDays = (v.stageAge ?? 0) - (stages.find((s) => s.id === v.current_stage_id)?.sla_days ?? 5);
        result.push({
          ...base, exceptionType: "overdue_stage",
          severity: overdueDays > 3 ? "critical" : overdueDays > 1 ? "urgent" : "warning",
          detail: `${formatDays(overdueDays)} over SLA in ${v.stageName}`,
        });
      }

      // Overdue total (> 7 days in recon)
      if ((v.totalReconAge ?? 0) > 7) {
        result.push({
          ...base, exceptionType: "overdue_total",
          severity: (v.totalReconAge ?? 0) > 14 ? "critical" : (v.totalReconAge ?? 0) > 10 ? "urgent" : "warning",
          detail: `${formatDays(v.totalReconAge)} total recon time`,
        });
      }

      // No assignee
      if (!v.assigned_to) {
        result.push({
          ...base, exceptionType: "no_assignee", severity: "urgent",
          detail: `Vehicle in ${v.stageName} with no assignee`,
        });
      }

      // No recent activity
      const daysSinceUpdate = (now - new Date(v.updated_at).getTime()) / 86400000;
      if (daysSinceUpdate > NO_ACTIVITY_DAYS) {
        result.push({
          ...base, exceptionType: "no_activity",
          severity: daysSinceUpdate > 5 ? "critical" : daysSinceUpdate > 3 ? "urgent" : "warning",
          detail: `No activity for ${formatDays(daysSinceUpdate)}`,
        });
      }

      // Pending approval
      if ((pendingApprovals[v.id] ?? 0) > 0) {
        result.push({
          ...base, exceptionType: "pending_approval", severity: "warning",
          detail: `${pendingApprovals[v.id]} pending approval(s)`,
        });
      }

      // Rework
      if (reworkVehicleIds.has(v.id)) {
        result.push({
          ...base, exceptionType: "rework", severity: "warning",
          detail: "Vehicle was moved backward in workflow",
        });
      }
    });

    return result.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [activeVehicles, stages, pendingApprovals, reworkVehicleIds]);

  const filtered = useMemo(() => {
    let result = exceptions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.vin.toLowerCase().includes(q) || e.stockNumber?.toLowerCase().includes(q) ||
          `${e.year} ${e.make} ${e.model}`.toLowerCase().includes(q)
      );
    }
    if (selectedStage !== "all") result = result.filter((e) => e.currentStageId === selectedStage);
    if (selectedAssignee === "unassigned") result = result.filter((e) => !e.assigneeName);
    else if (selectedAssignee !== "all") result = result.filter((e) => e.assigneeName === profileMap.get(selectedAssignee));
    if (selectedExceptionType !== "all") result = result.filter((e) => e.exceptionType === selectedExceptionType);
    if (selectedSeverity !== "all") result = result.filter((e) => e.severity === selectedSeverity);
    return result;
  }, [exceptions, searchQuery, selectedStage, selectedAssignee, selectedExceptionType, selectedSeverity, profileMap]);

  // Deduplicate for unique vehicle count
  const uniqueVehicleCount = new Set(filtered.map((e) => e.vehicleId)).size;
  const criticalCount = exceptions.filter((e) => e.severity === "critical").length;
  const urgentCount = exceptions.filter((e) => e.severity === "urgent").length;
  const noAssigneeCount = exceptions.filter((e) => e.exceptionType === "no_assignee").length;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const assigneeOptions = [...new Set(activeVehicles.map((v) => v.assigned_to).filter(Boolean))].map((id) => ({
    value: id!, label: profileMap.get(id!) ?? "Unknown",
  }));

  const exportData = filtered.map((e) => ({
    "Stock #": e.stockNumber ?? "", VIN: e.vin, Year: e.year ?? "", Make: e.make ?? "",
    Model: e.model ?? "", Stage: e.stageName, "Exception Type": EXCEPTION_LABELS[e.exceptionType],
    Severity: e.severity, Detail: e.detail, Assignee: e.assigneeName ?? "Unassigned",
    "Stage Age": Math.round(e.stageAge), "Total Age": Math.round(e.totalReconAge),
    "Last Update": formatDateTime(e.lastUpdate),
  }));

  const SeverityBadge = ({ severity }: { severity: string }) => (
    <Badge variant={severity === "critical" ? "destructive" : "outline"}
      className={cn(
        "text-xs",
        severity === "urgent" && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10",
        severity === "warning" && "border-muted-foreground/30 text-muted-foreground",
      )}>
      {severity}
    </Badge>
  );

  return (
    <ReportLayout
      title="Exception Report"
      description="Surface vehicles that need immediate attention"
      reportType="exception"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={{ stage: selectedStage, assignee: selectedAssignee, exceptionType: selectedExceptionType, severity: selectedSeverity }}
      sort={{}}
      onApplyView={(f) => {
        if (f.stage) setSelectedStage(f.stage);
        if (f.assignee) setSelectedAssignee(f.assignee);
        if (f.exceptionType) setSelectedExceptionType(f.exceptionType);
        if (f.severity) setSelectedSeverity(f.severity);
      }}
      exportData={exportData}
      exportFilename="exception-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Exceptions" value={exceptions.length} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <KpiCard label="Critical" value={criticalCount} variant={criticalCount > 0 ? "danger" : "default"} icon={<XCircle className="h-3.5 w-3.5" />} />
          <KpiCard label="Urgent" value={urgentCount} variant={urgentCount > 0 ? "warning" : "default"} icon={<AlertCircle className="h-3.5 w-3.5" />} />
          <KpiCard label="No Assignee" value={noAssigneeCount} variant={noAssigneeCount > 0 ? "warning" : "default"} icon={<UserX className="h-3.5 w-3.5" />} />
        </div>
      }
      filterBar={
        <>
          <ReportFilters
            stages={stageOptions} assignees={assigneeOptions}
            selectedStage={selectedStage} onStageChange={setSelectedStage}
            selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
            selectedSlaStatus={selectedSlaStatus} onSlaStatusChange={setSelectedSlaStatus}
            onClearAll={() => { setSelectedStage("all"); setSelectedAssignee("all"); setSelectedSlaStatus("all"); setSelectedExceptionType("all"); setSelectedSeverity("all"); }}
            extraFilters={
              <>
                <Select value={selectedExceptionType} onValueChange={setSelectedExceptionType}>
                  <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Exception Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(EXCEPTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        </>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {filtered.map((e, i) => (
              <Card key={`${e.vehicleId}-${e.exceptionType}-${i}`} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${e.vehicleId}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{e.year} {e.make} {e.model}</span>
                    <SeverityBadge severity={e.severity} />
                  </div>
                  <Badge variant="outline" className="text-xs">{EXCEPTION_LABELS[e.exceptionType]}</Badge>
                  <p className="text-xs text-muted-foreground">{e.detail}</p>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    <span>Stage: {e.stageName}</span>
                    <span>Assignee: {e.assigneeName ?? "—"}</span>
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
                  <TableHead>Exception</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Stage Age</TableHead>
                  <TableHead>Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e, i) => (
                  <TableRow key={`${e.vehicleId}-${e.exceptionType}-${i}`} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${e.vehicleId}`)}>
                    <TableCell className="font-mono text-xs">{e.stockNumber ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{e.year} {e.make} {e.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{e.vin}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{EXCEPTION_LABELS[e.exceptionType]}</Badge></TableCell>
                    <TableCell><SeverityBadge severity={e.severity} /></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{e.detail}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.stageName}</Badge></TableCell>
                    <TableCell className="text-sm">{e.assigneeName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right font-medium">{formatDays(e.stageAge)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(e.lastUpdate)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No exceptions found — everything looks good!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportLayout>
  );
}
