import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDate, formatDateTime } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "longest_wait" | "newest" | "approver" | "stage";

export default function ApprovalLagReport() {
  const navigate = useNavigate();
  const { vehicles, stages, repairItems, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedApprover, setSelectedApprover] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("longest_wait");

  const filters = { stage: selectedStage, approver: selectedApprover, status: selectedStatus };
  const sort = { sortBy };

  const now = Date.now();
  const dayMs = 86400000;

  // Build per-vehicle approval data
  const approvalData = useMemo(() => {
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const stageMap = new Map(stages.map((s) => [s.id, s.name]));

    // Group repair items by vehicle
    const byVehicle = new Map<string, typeof repairItems>();
    repairItems.forEach((ri) => {
      if (!byVehicle.has(ri.vehicle_id)) byVehicle.set(ri.vehicle_id, []);
      byVehicle.get(ri.vehicle_id)!.push(ri);
    });

    const rows: Array<{
      vehicleId: string;
      stockNumber: string | null;
      vin: string;
      year: number | null;
      make: string | null;
      model: string | null;
      dealership_id: string;
      stageName: string;
      currentStageId: string | null;
      approvalRequestedAt: string;
      waitDays: number;
      requestedBy: string | null;
      requestedByName: string;
      approver: string | null;
      approverName: string;
      approvalStatus: string;
      isOverdue: boolean;
      lastActivity: string;
      description: string;
    }> = [];

    byVehicle.forEach((items, vehicleId) => {
      const vehicle = vehicleMap.get(vehicleId);
      if (!vehicle) return;

      items.forEach((ri) => {
        const requestedAt = ri.created_at;
        const completedAt = ri.approved_at || ri.denied_at;
        const waitMs = completedAt
          ? new Date(completedAt).getTime() - new Date(requestedAt).getTime()
          : now - new Date(requestedAt).getTime();
        const waitDays = waitMs / dayMs;
        const isOverdue = !completedAt && waitDays > 1; // >24h considered overdue

        let approvalStatus = ri.status;
        if (ri.status === "pending") approvalStatus = "pending";
        else if (ri.approved_at) approvalStatus = "approved";
        else if (ri.denied_at) approvalStatus = "denied";

        rows.push({
          vehicleId,
          stockNumber: vehicle.stock_number,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          dealership_id: vehicle.dealership_id,
          stageName: vehicle.current_stage_id ? stageMap.get(vehicle.current_stage_id) ?? "Unknown" : "Unknown",
          currentStageId: vehicle.current_stage_id,
          approvalRequestedAt: requestedAt,
          waitDays,
          requestedBy: ri.created_by,
          requestedByName: ri.created_by ? profileMap.get(ri.created_by) ?? "Unknown" : "—",
          approver: ri.approved_by || ri.denied_by,
          approverName: (ri.approved_by ? profileMap.get(ri.approved_by) : ri.denied_by ? profileMap.get(ri.denied_by) : null) ?? "Unassigned",
          approvalStatus,
          isOverdue,
          lastActivity: vehicle.updated_at,
          description: ri.description,
        });
      });
    });

    return rows;
  }, [vehicles, stages, repairItems, profileMap, now]);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = approvalData;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.vin.toLowerCase().includes(q) || r.stockNumber?.toLowerCase().includes(q) ||
          `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      );
    }
    if (selectedStage !== "all") result = result.filter((r) => r.currentStageId === selectedStage);
    if (selectedApprover !== "all") result = result.filter((r) => r.approver === selectedApprover);
    if (selectedStatus === "pending") result = result.filter((r) => r.approvalStatus === "pending");
    else if (selectedStatus === "approved") result = result.filter((r) => r.approvalStatus === "approved");
    else if (selectedStatus === "denied") result = result.filter((r) => r.approvalStatus === "denied");
    else if (selectedStatus === "overdue") result = result.filter((r) => r.isOverdue);

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.approvalRequestedAt).getTime() - new Date(a.approvalRequestedAt).getTime();
        case "approver": return a.approverName.localeCompare(b.approverName);
        case "stage": return a.stageName.localeCompare(b.stageName);
        default: return b.waitDays - a.waitDays;
      }
    });
    return result;
  }, [approvalData, searchQuery, selectedStage, selectedApprover, selectedStatus, sortBy]);

  // KPIs
  const pendingItems = approvalData.filter((r) => r.approvalStatus === "pending");
  const overdueItems = pendingItems.filter((r) => r.isOverdue);
  const completedItems = approvalData.filter((r) => r.approvalStatus === "approved" || r.approvalStatus === "denied");
  const avgTurnaround = completedItems.length > 0
    ? completedItems.reduce((s, r) => s + r.waitDays, 0) / completedItems.length : 0;
  const longestWait = pendingItems.length > 0 ? Math.max(...pendingItems.map((r) => r.waitDays)) : 0;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const approverIds = [...new Set(approvalData.map((r) => r.approver).filter(Boolean))] as string[];
  const approverOptions = approverIds.map((id) => ({ value: id, label: profileMap.get(id) ?? "Unknown" }));

  const exportData = filtered.map((r) => ({
    "Stock #": r.stockNumber ?? "", VIN: r.vin, Year: r.year ?? "", Make: r.make ?? "",
    Model: r.model ?? "", Stage: r.stageName, Description: r.description,
    "Requested At": formatDateTime(r.approvalRequestedAt),
    "Wait Time (days)": Math.round(r.waitDays * 10) / 10,
    "Requested By": r.requestedByName, Approver: r.approverName,
    Status: r.approvalStatus, Overdue: r.isOverdue ? "Yes" : "No",
  }));

  const StatusBadge = ({ status, overdue }: { status: string; overdue: boolean }) => {
    if (status === "approved") return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
    if (status === "denied") return <Badge variant="destructive">Denied</Badge>;
    if (overdue) return <Badge variant="destructive">Overdue</Badge>;
    return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">Pending</Badge>;
  };

  return (
    <ReportLayout
      title="Approval Lag Report"
      description="Identify delays caused by vehicles waiting for management approval"
      reportType="approval-lag"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      sort={sort}
      onApplyView={(f, s) => {
        if (f.stage) setSelectedStage(f.stage);
        if (f.approver) setSelectedApprover(f.approver);
        if (f.status) setSelectedStatus(f.status);
        if (s.sortBy) setSortBy(s.sortBy);
      }}
      exportData={exportData}
      exportFilename="approval-lag-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Awaiting Approval" value={pendingItems.length} icon={<Gavel className="h-3.5 w-3.5" />} variant={pendingItems.length > 0 ? "warning" : "default"} />
          <KpiCard label="Overdue" value={overdueItems.length} icon={<AlertTriangle className="h-3.5 w-3.5" />} variant={overdueItems.length > 0 ? "danger" : "default"} />
          <KpiCard label="Avg Turnaround" value={formatDays(avgTurnaround)} icon={<Clock className="h-3.5 w-3.5" />} />
          <KpiCard label="Longest Wait" value={formatDays(longestWait)} icon={<Clock className="h-3.5 w-3.5" />} variant={longestWait > 2 ? "danger" : "default"} />
        </div>
      }
      filterBar={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedApprover} onValueChange={setSelectedApprover}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Approvers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approvers</SelectItem>
              {approverOptions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="longest_wait">Longest Wait</SelectItem>
              <SelectItem value="newest">Newest Request</SelectItem>
              <SelectItem value="approver">Approver</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((r, i) => (
              <Card key={`${r.vehicleId}-${i}`} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.year} {r.make} {r.model}</span>
                    <StatusBadge status={r.approvalStatus} overdue={r.isOverdue} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stock: {r.stockNumber ?? "—"}</span>
                    <span>Stage: {r.stageName}</span>
                    <span>Wait: {formatDays(r.waitDays)}</span>
                    <span>Approver: {r.approverName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No approval items found</div>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Wait Time</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={`${r.vehicleId}-${i}`} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                    <TableCell className="font-mono text-xs">{r.stockNumber ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.year} {r.make} {r.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.vin}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{r.stageName}</Badge></TableCell>
                    <TableCell className="text-right font-bold">{formatDays(r.waitDays)}</TableCell>
                    <TableCell className="text-xs">{r.requestedByName}</TableCell>
                    <TableCell className="text-xs">{r.approverName}</TableCell>
                    <TableCell><StatusBadge status={r.approvalStatus} overdue={r.isOverdue} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.approvalRequestedAt)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No approval items match your filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportLayout>
  );
}
