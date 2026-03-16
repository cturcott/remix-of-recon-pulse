import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDays, formatDate } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, TrendingUp, Calendar, Car } from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "all";
type SortKey = "newest_flr" | "oldest_flr" | "total_age" | "source";

export default function FLROutputReport() {
  const navigate = useNavigate();
  const { vehicles, stages, stageHistory, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedSource, setSelectedSource] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest_flr");

  const filters = { dateRange, source: selectedSource };
  const sort = { sortBy };

  const completionStageIds = useMemo(() => stages.filter((s) => s.is_completion_stage).map((s) => s.id), [stages]);

  const now = Date.now();
  const dayMs = 86400000;

  const completedVehicles = useMemo(() => {
    const rangeMs = dateRange === "7d" ? 7 * dayMs : dateRange === "30d" ? 30 * dayMs : dateRange === "90d" ? 90 * dayMs : Infinity;

    return vehicles
      .filter((v) => v.status === "completed" || completionStageIds.includes(v.current_stage_id ?? ""))
      .map((v) => {
        const flrEntry = stageHistory.find(
          (h) => h.vehicle_id === v.id && completionStageIds.includes(h.to_stage_id)
        );
        const flrDate = flrEntry?.changed_at ?? v.updated_at;
        const totalReconAge = (new Date(flrDate).getTime() - new Date(v.created_at).getTime()) / dayMs;
        return {
          ...v,
          flrDate,
          totalReconDays: totalReconAge,
          assigneeName: v.assigned_to ? profileMap.get(v.assigned_to) ?? "Unknown" : "—",
        };
      })
      .filter((v) => {
        if (rangeMs === Infinity) return true;
        return (now - new Date(v.flrDate).getTime()) < rangeMs;
      });
  }, [vehicles, completionStageIds, stageHistory, dateRange, profileMap, now]);

  const filtered = useMemo(() => {
    let result = completedVehicles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) => v.vin.toLowerCase().includes(q) || v.stock_number?.toLowerCase().includes(q) ||
          `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q)
      );
    }
    if (selectedSource !== "all") result = result.filter((v) => v.acquisition_source === selectedSource);

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest_flr": return new Date(a.flrDate).getTime() - new Date(b.flrDate).getTime();
        case "total_age": return b.totalReconDays - a.totalReconDays;
        case "source": return (a.acquisition_source ?? "").localeCompare(b.acquisition_source ?? "");
        default: return new Date(b.flrDate).getTime() - new Date(a.flrDate).getTime();
      }
    });
    return result;
  }, [completedVehicles, searchQuery, selectedSource, sortBy]);

  // KPIs
  const totalCompleted = filtered.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const completedToday = filtered.filter((v) => new Date(v.flrDate).getTime() >= todayMs).length;
  const thisWeekMs = todayMs - (today.getDay() * dayMs);
  const completedThisWeek = filtered.filter((v) => new Date(v.flrDate).getTime() >= thisWeekMs).length;
  const avgReconAge = totalCompleted > 0
    ? filtered.reduce((s, v) => s + v.totalReconDays, 0) / totalCompleted : 0;

  // Active in recon for backlog comparison
  const activeInRecon = vehicles.filter((v) => v.status === "in_recon").length;

  const sourceOptions = [...new Set(vehicles.map((v) => v.acquisition_source).filter(Boolean))] as string[];

  const exportData = filtered.map((v) => ({
    "Stock #": v.stock_number ?? "", VIN: v.vin, Year: v.year ?? "", Make: v.make ?? "",
    Model: v.model ?? "", "Intake Date": formatDate(v.created_at), "FLR Date": formatDate(v.flrDate),
    "Total Recon Age": Math.round(v.totalReconDays * 10) / 10,
    Assignee: v.assigneeName, Source: v.acquisition_source ?? "",
  }));

  return (
    <ReportLayout
      title="Front-Line-Ready Output Report"
      description="Measure recon production output — how many vehicles are reaching FLR status"
      reportType="flr-output"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      sort={sort}
      onApplyView={(f, s) => {
        if (f.dateRange) setDateRange(f.dateRange);
        if (f.source) setSelectedSource(f.source);
        if (s.sortBy) setSortBy(s.sortBy);
      }}
      exportData={exportData}
      exportFilename="flr-output-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard label="FLR Today" value={completedToday} icon={<CheckCircle className="h-3.5 w-3.5" />} variant="success" />
          <KpiCard label="FLR This Week" value={completedThisWeek} icon={<Calendar className="h-3.5 w-3.5" />} variant="success" />
          <KpiCard label="Total in Period" value={totalCompleted} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <KpiCard label="Avg Recon Age" value={formatDays(avgReconAge)} icon={<Car className="h-3.5 w-3.5" />} />
          <KpiCard label="Backlog (Active)" value={activeInRecon} icon={<Car className="h-3.5 w-3.5" />} variant={activeInRecon > totalCompleted ? "warning" : "default"} />
        </div>
      }
      filterBar={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sourceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest_flr">Newest FLR</SelectItem>
              <SelectItem value="oldest_flr">Oldest in Range</SelectItem>
              <SelectItem value="total_age">Total Recon Age</SelectItem>
              <SelectItem value="source">Source</SelectItem>
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
            {filtered.map((v) => (
              <Card key={v.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${v.id}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{v.year} {v.make} {v.model}</span>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">FLR {formatDays(v.totalReconDays)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stock: {v.stock_number ?? "—"}</span>
                    <span>Source: {v.acquisition_source ?? "—"}</span>
                    <span>Intake: {formatDate(v.created_at)}</span>
                    <span>FLR: {formatDate(v.flrDate)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No completed vehicles in this period</div>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Intake Date</TableHead>
                  <TableHead>FLR Date</TableHead>
                  <TableHead className="text-right">Recon Age</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Source</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(v.flrDate)}</TableCell>
                    <TableCell className="text-right font-bold">{formatDays(v.totalReconDays)}</TableCell>
                    <TableCell className="text-xs">{v.assigneeName}</TableCell>
                    <TableCell className="text-xs">{v.acquisition_source ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No completed vehicles in this period</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ReportLayout>
  );
}
