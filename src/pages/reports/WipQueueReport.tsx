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
import { Car, Clock, AlertTriangle, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WipQueueReport() {
  const navigate = useNavigate();
  const { vehicles, stages, repairItems, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedSlaStatus, setSelectedSlaStatus] = useState("all");

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === "in_recon"), [vehicles]);

  // Pending approvals per vehicle
  const pendingApprovals = useMemo(() => {
    const map: Record<string, number> = {};
    repairItems.filter((r) => r.status === "pending").forEach((r) => {
      map[r.vehicle_id] = (map[r.vehicle_id] || 0) + 1;
    });
    return map;
  }, [repairItems]);

  const filtered = useMemo(() => {
    let result = activeVehicles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) => v.vin.toLowerCase().includes(q) || v.stock_number?.toLowerCase().includes(q) ||
          `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q)
      );
    }
    if (selectedStage !== "all") result = result.filter((v) => v.current_stage_id === selectedStage);
    if (selectedAssignee === "unassigned") result = result.filter((v) => !v.assigned_to);
    else if (selectedAssignee !== "all") result = result.filter((v) => v.assigned_to === selectedAssignee);
    if (selectedSlaStatus !== "all") result = result.filter((v) => v.slaStatus === selectedSlaStatus);

    return result.sort((a, b) => (b.stageAge ?? 0) - (a.stageAge ?? 0));
  }, [activeVehicles, searchQuery, selectedStage, selectedAssignee, selectedSlaStatus]);

  const awaitingApproval = activeVehicles.filter((v) => (pendingApprovals[v.id] ?? 0) > 0).length;
  const unassignedCount = activeVehicles.filter((v) => !v.assigned_to).length;
  const overdueCount = activeVehicles.filter((v) => v.slaStatus === "overdue").length;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const assigneeOptions = [...new Set(activeVehicles.map((v) => v.assigned_to).filter(Boolean))].map((id) => ({
    value: id!, label: profileMap.get(id!) ?? "Unknown",
  }));

  const exportData = filtered.map((v) => ({
    "Stock #": v.stock_number ?? "", VIN: v.vin, Year: v.year ?? "", Make: v.make ?? "",
    Model: v.model ?? "", Stage: v.stageName ?? "", "Stage Age": Math.round(v.stageAge ?? 0),
    "Total Age": Math.round(v.totalReconAge ?? 0), Assignee: v.assigneeName ?? "Unassigned",
    "Pending Approvals": pendingApprovals[v.id] ?? 0, "SLA Status": v.slaStatus ?? "",
    "Last Update": formatDateTime(v.updated_at),
  }));

  return (
    <ReportLayout
      title="Work-in-Progress Queue"
      description="Live operational view of all vehicles currently in the recon pipeline"
      reportType="wip"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={{ stage: selectedStage, assignee: selectedAssignee, slaStatus: selectedSlaStatus }}
      sort={{}}
      onApplyView={(f) => {
        if (f.stage) setSelectedStage(f.stage);
        if (f.assignee) setSelectedAssignee(f.assignee);
        if (f.slaStatus) setSelectedSlaStatus(f.slaStatus);
      }}
      exportData={exportData}
      exportFilename="wip-queue-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total WIP" value={activeVehicles.length} icon={<Car className="h-3.5 w-3.5" />} />
          <KpiCard label="Awaiting Approval" value={awaitingApproval} variant={awaitingApproval > 0 ? "warning" : "default"} icon={<PauseCircle className="h-3.5 w-3.5" />} />
          <KpiCard label="Overdue" value={overdueCount} variant={overdueCount > 0 ? "danger" : "default"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <KpiCard label="Unassigned" value={unassignedCount} variant={unassignedCount > 0 ? "warning" : "default"} icon={<Clock className="h-3.5 w-3.5" />} />
        </div>
      }
      filterBar={
        <ReportFilters
          stages={stageOptions} assignees={assigneeOptions}
          selectedStage={selectedStage} onStageChange={setSelectedStage}
          selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
          selectedSlaStatus={selectedSlaStatus} onSlaStatusChange={setSelectedSlaStatus}
          onClearAll={() => { setSelectedStage("all"); setSelectedAssignee("all"); setSelectedSlaStatus("all"); }}
        />
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {filtered.map((v) => (
              <Card key={v.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${v.id}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{v.year} {v.make} {v.model}</span>
                    <Badge variant={v.slaStatus === "overdue" ? "destructive" : "secondary"} className="text-xs">
                      {v.slaStatus === "overdue" ? "Overdue" : v.slaStatus === "warning" ? "Warning" : "On Track"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stage: {v.stageName}</span>
                    <span>In Stage: {formatDays(v.stageAge)}</span>
                    <span>Total: {formatDays(v.totalReconAge)}</span>
                    <span>Assignee: {v.assigneeName ?? "—"}</span>
                    {(pendingApprovals[v.id] ?? 0) > 0 && (
                      <span className="text-yellow-600 col-span-2">⏳ {pendingApprovals[v.id]} pending approval(s)</span>
                    )}
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
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Stage Age</TableHead>
                  <TableHead className="text-right">Total Age</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Approvals</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${v.id}`)}>
                    <TableCell className="font-mono text-xs">{v.stock_number ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{v.year} {v.make} {v.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{v.vin}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{v.stageName}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatDays(v.stageAge)}</TableCell>
                    <TableCell className="text-right">{formatDays(v.totalReconAge)}</TableCell>
                    <TableCell className="text-sm">{v.assigneeName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {(pendingApprovals[v.id] ?? 0) > 0 ? (
                        <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">{pendingApprovals[v.id]} pending</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.slaStatus === "overdue" ? "destructive" : v.slaStatus === "warning" ? "outline" : "secondary"}
                        className={cn(v.slaStatus === "warning" && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10", "text-xs")}>
                        {v.slaStatus === "overdue" ? "Overdue" : v.slaStatus === "warning" ? "Warning" : "On Track"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(v.updated_at)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No vehicles match your filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportLayout>
  );
}
