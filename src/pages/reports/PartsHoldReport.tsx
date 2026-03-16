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
import { Package, Clock, AlertTriangle, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const HOLD_CATEGORIES = ["parts", "tires", "glass", "wheels"];
const SUBLET_CATEGORIES = ["sublet"];

type HoldType = "parts" | "sublet" | "all";
type SortKey = "longest_hold" | "newest" | "vendor" | "stage";

export default function PartsHoldReport() {
  const navigate = useNavigate();
  const { vehicles, stages, repairItems, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedHoldType, setSelectedHoldType] = useState<HoldType>("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("longest_hold");

  const filters = { stage: selectedStage, holdType: selectedHoldType, vendor: selectedVendor };
  const sort = { sortBy };

  const now = Date.now();
  const dayMs = 86400000;

  const holdData = useMemo(() => {
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const stageMap = new Map(stages.map((s) => [s.id, s.name]));

    return repairItems
      .filter((ri) => {
        const cat = (ri.category ?? "").toLowerCase();
        return HOLD_CATEGORIES.includes(cat) || SUBLET_CATEGORIES.includes(cat);
      })
      .map((ri) => {
        const vehicle = vehicleMap.get(ri.vehicle_id);
        if (!vehicle) return null;

        const cat = (ri.category ?? "").toLowerCase();
        const holdType: "parts" | "sublet" = SUBLET_CATEGORIES.includes(cat) ? "sublet" : "parts";
        const isActive = ri.status === "pending" || ri.status === "in_progress";
        const holdStart = ri.created_at;
        const holdEnd = ri.approved_at || ri.denied_at;
        const holdDays = isActive
          ? (now - new Date(holdStart).getTime()) / dayMs
          : holdEnd ? (new Date(holdEnd).getTime() - new Date(holdStart).getTime()) / dayMs : 0;
        const isOverdue = isActive && holdDays > 3;

        return {
          id: ri.id,
          vehicleId: ri.vehicle_id,
          stockNumber: vehicle.stock_number,
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          currentStageId: vehicle.current_stage_id,
          stageName: vehicle.current_stage_id ? stageMap.get(vehicle.current_stage_id) ?? "Unknown" : "Unknown",
          holdType,
          holdReason: ri.description,
          vendorName: ri.vendor_name ?? "—",
          holdStart,
          holdDays,
          isActive,
          isOverdue,
          assignee: vehicle.assigned_to ? profileMap.get(vehicle.assigned_to) ?? "Unknown" : "—",
          lastActivity: vehicle.updated_at,
          category: ri.category ?? "Other",
        };
      })
      .filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[];
  }, [vehicles, stages, repairItems, profileMap, now]);

  const filtered = useMemo(() => {
    let result = holdData;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r: any) => r.vin.toLowerCase().includes(q) || r.stockNumber?.toLowerCase().includes(q) ||
          `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q) || r.holdReason.toLowerCase().includes(q)
      );
    }
    if (selectedStage !== "all") result = result.filter((r: any) => r.currentStageId === selectedStage);
    if (selectedHoldType !== "all") result = result.filter((r: any) => r.holdType === selectedHoldType);
    if (selectedVendor !== "all") result = result.filter((r: any) => r.vendorName === selectedVendor);

    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest": return new Date(b.holdStart).getTime() - new Date(a.holdStart).getTime();
        case "vendor": return a.vendorName.localeCompare(b.vendorName);
        case "stage": return a.stageName.localeCompare(b.stageName);
        default: return b.holdDays - a.holdDays;
      }
    });
    return result;
  }, [holdData, searchQuery, selectedStage, selectedHoldType, selectedVendor, sortBy]);

  // KPIs
  const activeHolds = holdData.filter((r: any) => r.isActive);
  const partsHolds = activeHolds.filter((r: any) => r.holdType === "parts");
  const subletHolds = activeHolds.filter((r: any) => r.holdType === "sublet");
  const overdueHolds = activeHolds.filter((r: any) => r.isOverdue);
  const avgHoldDuration = activeHolds.length > 0
    ? activeHolds.reduce((s: number, r: any) => s + r.holdDays, 0) / activeHolds.length : 0;
  const longestHold = activeHolds.length > 0 ? Math.max(...activeHolds.map((r: any) => r.holdDays)) : 0;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const vendorNames = [...new Set(holdData.map((r: any) => r.vendorName).filter((v: string) => v !== "—"))];
  const vendorOptions = vendorNames.map((v) => ({ value: v as string, label: v as string }));

  const exportData = filtered.map((r: any) => ({
    "Stock #": r.stockNumber ?? "", VIN: r.vin, Year: r.year ?? "", Make: r.make ?? "",
    Model: r.model ?? "", Stage: r.stageName, "Hold Type": r.holdType,
    Reason: r.holdReason, Vendor: r.vendorName,
    "Hold Started": formatDateTime(r.holdStart), "Hold Duration (days)": Math.round(r.holdDays * 10) / 10,
    Active: r.isActive ? "Yes" : "No", Overdue: r.isOverdue ? "Yes" : "No",
    Assignee: r.assignee,
  }));

  return (
    <ReportLayout
      title="Parts Hold / Sublet Delay Report"
      description="Identify vehicles delayed by parts availability or outside vendor work"
      reportType="parts-hold"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      sort={sort}
      onApplyView={(f, s) => {
        if (f.stage) setSelectedStage(f.stage);
        if (f.holdType) setSelectedHoldType(f.holdType);
        if (f.vendor) setSelectedVendor(f.vendor);
        if (s.sortBy) setSortBy(s.sortBy);
      }}
      exportData={exportData}
      exportFilename="parts-hold-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Parts Holds" value={partsHolds.length} icon={<Package className="h-3.5 w-3.5" />} variant={partsHolds.length > 0 ? "warning" : "default"} />
          <KpiCard label="Sublet Delays" value={subletHolds.length} icon={<Truck className="h-3.5 w-3.5" />} variant={subletHolds.length > 0 ? "warning" : "default"} />
          <KpiCard label="Overdue" value={overdueHolds.length} icon={<AlertTriangle className="h-3.5 w-3.5" />} variant={overdueHolds.length > 0 ? "danger" : "default"} />
          <KpiCard label="Avg Hold" value={formatDays(avgHoldDuration)} icon={<Clock className="h-3.5 w-3.5" />} />
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
          <Select value={selectedHoldType} onValueChange={(v) => setSelectedHoldType(v as HoldType)}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Hold Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="parts">Parts Hold</SelectItem>
              <SelectItem value="sublet">Sublet</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Vendors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendorOptions.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="longest_hold">Longest Hold</SelectItem>
              <SelectItem value="newest">Newest Hold</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
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
            {filtered.map((r: any) => (
              <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.year} {r.make} {r.model}</span>
                    <Badge variant={r.isOverdue ? "destructive" : "outline"} className={cn(!r.isOverdue && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10")}>
                      {r.holdType === "sublet" ? "Sublet" : "Parts"} {r.isOverdue ? "Overdue" : ""}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.holdReason}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stock: {r.stockNumber ?? "—"}</span>
                    <span>Hold: {formatDays(r.holdDays)}</span>
                    <span>Vendor: {r.vendorName}</span>
                    <span>Stage: {r.stageName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No holds or delays found</div>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Hold Duration</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                    <TableCell className="font-mono text-xs">{r.stockNumber ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.year} {r.make} {r.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.vin}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{r.holdType === "sublet" ? "Sublet" : "Parts"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{r.holdReason}</TableCell>
                    <TableCell className="text-xs">{r.vendorName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{r.stageName}</Badge></TableCell>
                    <TableCell className="text-right font-bold">{formatDays(r.holdDays)}</TableCell>
                    <TableCell className="text-xs">{r.assignee}</TableCell>
                    <TableCell>
                      {r.isActive ? (
                        <Badge variant={r.isOverdue ? "destructive" : "outline"} className={cn(!r.isOverdue && "border-yellow-500/50 text-yellow-600 bg-yellow-500/10")}>
                          {r.isOverdue ? "Overdue" : "Active"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Resolved</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No holds or delays match your filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportLayout>
  );
}
