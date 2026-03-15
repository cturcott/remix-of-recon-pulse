import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData, ReportVehicle } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilters from "@/components/reports/ReportFilters";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDate, formatDateTime } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "total_age_desc" | "stage_age_desc" | "newest" | "assignee" | "priority";

export default function ReconAgingReport() {
  const navigate = useNavigate();
  const { vehicles, stages, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedSlaStatus, setSelectedSlaStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("total_age_desc");

  const filters = { stage: selectedStage, assignee: selectedAssignee, slaStatus: selectedSlaStatus };
  const sort = { sortBy };

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === "in_recon"), [vehicles]);

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

    result.sort((a, b) => {
      switch (sortBy) {
        case "stage_age_desc": return (b.stageAge ?? 0) - (a.stageAge ?? 0);
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "assignee": return (a.assigneeName ?? "zzz").localeCompare(b.assigneeName ?? "zzz");
        default: return (b.totalReconAge ?? 0) - (a.totalReconAge ?? 0);
      }
    });
    return result;
  }, [activeVehicles, searchQuery, selectedStage, selectedAssignee, selectedSlaStatus, sortBy]);

  const overdueCount = activeVehicles.filter((v) => v.slaStatus === "overdue").length;
  const warningCount = activeVehicles.filter((v) => v.slaStatus === "warning").length;
  const avgAge = activeVehicles.length > 0
    ? Math.round(activeVehicles.reduce((s, v) => s + (v.totalReconAge ?? 0), 0) / activeVehicles.length)
    : 0;
  const oldestAge = activeVehicles.length > 0
    ? Math.round(Math.max(...activeVehicles.map((v) => v.totalReconAge ?? 0)))
    : 0;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const assigneeOptions = [...new Set(activeVehicles.map((v) => v.assigned_to).filter(Boolean))].map((id) => ({
    value: id!, label: profileMap.get(id!) ?? "Unknown",
  }));

  const exportData = filtered.map((v) => ({
    "Stock #": v.stock_number ?? "", VIN: v.vin, Year: v.year ?? "", Make: v.make ?? "",
    Model: v.model ?? "", "Current Stage": v.stageName ?? "", "Total Age (days)": Math.round(v.totalReconAge ?? 0),
    "Stage Age (days)": Math.round(v.stageAge ?? 0), Assignee: v.assigneeName ?? "Unassigned",
    "SLA Status": v.slaStatus ?? "", "Intake Date": formatDate(v.created_at),
    "Last Update": formatDateTime(v.updated_at), Source: v.acquisition_source ?? "",
  }));

  const SlaStatusBadge = ({ status }: { status?: string }) => (
    <Badge variant={status === "overdue" ? "destructive" : status === "warning" ? "outline" : "secondary"}
      className={cn(status === "warning" && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10")}>
      {status === "overdue" ? "Overdue" : status === "warning" ? "Warning" : "On Track"}
    </Badge>
  );

  return (
    <ReportLayout
      title="Recon Aging Report"
      description="Track how long vehicles have been in recon and identify aging inventory"
      reportType="aging"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      sort={sort}
      onApplyView={(f, s) => {
        if (f.stage) setSelectedStage(f.stage);
        if (f.assignee) setSelectedAssignee(f.assignee);
        if (f.slaStatus) setSelectedSlaStatus(f.slaStatus);
        if (s.sortBy) setSortBy(s.sortBy);
      }}
      exportData={exportData}
      exportFilename="recon-aging-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="In Recon" value={activeVehicles.length} icon={<Car className="h-3.5 w-3.5" />} />
          <KpiCard label="Avg Age" value={`${avgAge}d`} icon={<Clock className="h-3.5 w-3.5" />} />
          <KpiCard label="Overdue" value={overdueCount} variant="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <KpiCard label="Oldest Unit" value={`${oldestAge}d`} variant={oldestAge > 7 ? "warning" : "default"} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        </div>
      }
      filterBar={
        <>
          <ReportFilters
            stages={stageOptions} assignees={assigneeOptions}
            selectedStage={selectedStage} onStageChange={setSelectedStage}
            selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
            selectedSlaStatus={selectedSlaStatus} onSlaStatusChange={setSelectedSlaStatus}
            onClearAll={() => { setSelectedStage("all"); setSelectedAssignee("all"); setSelectedSlaStatus("all"); }}
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_age_desc">Oldest in Recon</SelectItem>
              <SelectItem value="stage_age_desc">Oldest in Stage</SelectItem>
              <SelectItem value="newest">Newest Intaked</SelectItem>
              <SelectItem value="assignee">Assignee</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((v) => (
              <Card key={v.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${v.id}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{v.year} {v.make} {v.model}</span>
                    <SlaStatusBadge status={v.slaStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stock: {v.stock_number ?? "—"}</span>
                    <span>Stage: {v.stageName}</span>
                    <span>Total: {formatDays(v.totalReconAge)}</span>
                    <span>In Stage: {formatDays(v.stageAge)}</span>
                    <span>Assignee: {v.assigneeName ?? "—"}</span>
                    <span>Source: {v.acquisition_source ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Total Age</TableHead>
                  <TableHead className="text-right">Stage Age</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Intake</TableHead>
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
                    <TableCell className="text-right font-medium">{formatDays(v.totalReconAge)}</TableCell>
                    <TableCell className="text-right font-medium">{formatDays(v.stageAge)}</TableCell>
                    <TableCell className="text-sm">{v.assigneeName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><SlaStatusBadge status={v.slaStatus} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.created_at)}</TableCell>
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
