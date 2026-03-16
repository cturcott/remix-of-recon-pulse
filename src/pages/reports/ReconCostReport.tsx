import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import ReportLayout from "@/components/reports/ReportLayout";
import KpiCard from "@/components/reports/KpiCard";
import { formatDate } from "@/lib/reportExport";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

type SortKey = "highest_cost" | "largest_variance" | "source" | "vendor" | "category";

export default function ReconCostReport() {
  const navigate = useNavigate();
  const { vehicles, repairItems, isLoading, profileMap } = useReportData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [overBudgetOnly, setOverBudgetOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("highest_cost");

  const filters = { source: selectedSource, category: selectedCategory, vendor: selectedVendor, overBudgetOnly };
  const sort = { sortBy };

  // Build per-vehicle cost summary
  const vehicleCosts = useMemo(() => {
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

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
      source: string | null;
      estimatedCost: number;
      actualCost: number;
      variance: number;
      isOverBudget: boolean;
      topCategory: string;
      topVendor: string;
      itemCount: number;
      categories: Map<string, number>;
      vendors: Map<string, number>;
    }> = [];

    byVehicle.forEach((items, vehicleId) => {
      const vehicle = vehicleMap.get(vehicleId);
      if (!vehicle) return;

      let estimatedCost = 0;
      let actualCost = 0;
      const categories = new Map<string, number>();
      const vendors = new Map<string, number>();

      items.forEach((ri) => {
        estimatedCost += ri.estimated_cost ?? 0;
        actualCost += ri.actual_cost ?? 0;
        const cat = ri.category ?? "Other";
        categories.set(cat, (categories.get(cat) ?? 0) + (ri.actual_cost ?? ri.estimated_cost ?? 0));
        if (ri.vendor_name) {
          vendors.set(ri.vendor_name, (vendors.get(ri.vendor_name) ?? 0) + (ri.actual_cost ?? ri.estimated_cost ?? 0));
        }
      });

      const variance = actualCost - estimatedCost;
      const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      const topVendor = [...vendors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      rows.push({
        vehicleId,
        stockNumber: vehicle.stock_number,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        source: vehicle.acquisition_source,
        estimatedCost,
        actualCost,
        variance,
        isOverBudget: variance > 0 && estimatedCost > 0,
        topCategory,
        topVendor,
        itemCount: items.length,
        categories,
        vendors,
      });
    });

    return rows;
  }, [vehicles, repairItems]);

  const filtered = useMemo(() => {
    let result = vehicleCosts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.vin.toLowerCase().includes(q) || r.stockNumber?.toLowerCase().includes(q) ||
          `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q)
      );
    }
    if (selectedSource !== "all") result = result.filter((r) => r.source === selectedSource);
    if (selectedCategory !== "all") result = result.filter((r) => r.categories.has(selectedCategory));
    if (selectedVendor !== "all") result = result.filter((r) => r.vendors.has(selectedVendor));
    if (overBudgetOnly) result = result.filter((r) => r.isOverBudget);

    result.sort((a, b) => {
      switch (sortBy) {
        case "largest_variance": return b.variance - a.variance;
        case "source": return (a.source ?? "").localeCompare(b.source ?? "");
        case "vendor": return a.topVendor.localeCompare(b.topVendor);
        case "category": return a.topCategory.localeCompare(b.topCategory);
        default: return b.actualCost - a.actualCost;
      }
    });
    return result;
  }, [vehicleCosts, searchQuery, selectedSource, selectedCategory, selectedVendor, overBudgetOnly, sortBy]);

  // KPIs
  const totalEstimated = vehicleCosts.reduce((s, r) => s + r.estimatedCost, 0);
  const totalActual = vehicleCosts.reduce((s, r) => s + r.actualCost, 0);
  const avgCostPerVehicle = vehicleCosts.length > 0 ? totalActual / vehicleCosts.length : 0;
  const overBudgetCount = vehicleCosts.filter((r) => r.isOverBudget).length;

  // Category breakdown for summary
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    repairItems.forEach((ri) => {
      const cat = ri.category ?? "Other";
      totals.set(cat, (totals.get(cat) ?? 0) + (ri.actual_cost ?? ri.estimated_cost ?? 0));
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [repairItems]);

  const allCategories = [...new Set(repairItems.map((ri) => ri.category ?? "Other"))];
  const allVendors = [...new Set(repairItems.map((ri) => ri.vendor_name).filter(Boolean))] as string[];
  const sourceOptions = [...new Set(vehicles.map((v) => v.acquisition_source).filter(Boolean))] as string[];

  const exportData = filtered.map((r) => ({
    "Stock #": r.stockNumber ?? "", VIN: r.vin, Year: r.year ?? "", Make: r.make ?? "",
    Model: r.model ?? "", Source: r.source ?? "",
    "Estimated Cost": r.estimatedCost, "Actual Cost": r.actualCost,
    Variance: r.variance, "Over Budget": r.isOverBudget ? "Yes" : "No",
    "Top Category": r.topCategory, "Top Vendor": r.topVendor, "Line Items": r.itemCount,
  }));

  return (
    <ReportLayout
      title="Recon Cost Report"
      description="Track estimated vs actual recon cost by vehicle, category, and vendor"
      reportType="recon-cost"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      sort={sort}
      onApplyView={(f, s) => {
        if (f.source) setSelectedSource(f.source);
        if (f.category) setSelectedCategory(f.category);
        if (f.vendor) setSelectedVendor(f.vendor);
        if (f.overBudgetOnly !== undefined) setOverBudgetOnly(f.overBudgetOnly);
        if (s.sortBy) setSortBy(s.sortBy);
      }}
      exportData={exportData}
      exportFilename="recon-cost-report"
      totalCount={filtered.length}
      kpiBar={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Spend" value={formatCurrency(totalActual)} icon={<DollarSign className="h-3.5 w-3.5" />} />
          <KpiCard label="Avg / Vehicle" value={formatCurrency(avgCostPerVehicle)} icon={<BarChart3 className="h-3.5 w-3.5" />} />
          <KpiCard label="Variance" value={formatCurrency(totalActual - totalEstimated)} icon={<TrendingUp className="h-3.5 w-3.5" />} variant={totalActual > totalEstimated ? "danger" : "success"} />
          <KpiCard label="Over Budget" value={overBudgetCount} icon={<AlertTriangle className="h-3.5 w-3.5" />} variant={overBudgetCount > 0 ? "danger" : "default"} />
        </div>
      }
      filterBar={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sourceOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="All Vendors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {allVendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={overBudgetOnly ? "over" : "all_budget"} onValueChange={(v) => setOverBudgetOnly(v === "over")}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Budget Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_budget">All Vehicles</SelectItem>
              <SelectItem value="over">Over Budget Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="highest_cost">Highest Cost</SelectItem>
              <SelectItem value="largest_variance">Largest Variance</SelectItem>
              <SelectItem value="source">Source</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Category breakdown mini-chart */}
          {categoryTotals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryTotals.slice(0, 8).map(([cat, total]) => {
                  const maxCat = categoryTotals[0][1] || 1;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-[120px] truncate">{cat}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${(total / maxCat) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium w-[80px] text-right">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((r) => (
              <Card key={r.vehicleId} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.year} {r.make} {r.model}</span>
                    {r.isOverBudget && <Badge variant="destructive" className="text-xs">Over Budget</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Stock: {r.stockNumber ?? "—"}</span>
                    <span>Items: {r.itemCount}</span>
                    <span>Estimated: {formatCurrency(r.estimatedCost)}</span>
                    <span>Actual: {formatCurrency(r.actualCost)}</span>
                    <span className={cn(r.variance > 0 ? "text-destructive" : "text-green-600")}>
                      Variance: {formatCurrency(r.variance)}
                    </span>
                    <span>Category: {r.topCategory}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No cost data found</div>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Stock #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Top Category</TableHead>
                  <TableHead>Top Vendor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.vehicleId} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/vehicle/${r.vehicleId}`)}>
                    <TableCell className="font-mono text-xs">{r.stockNumber ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.year} {r.make} {r.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.vin}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(r.estimatedCost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.actualCost)}</TableCell>
                    <TableCell className={cn("text-right font-medium", r.variance > 0 ? "text-destructive" : "text-green-600")}>
                      {r.variance > 0 ? "+" : ""}{formatCurrency(r.variance)}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{r.topCategory}</Badge></TableCell>
                    <TableCell className="text-xs">{r.topVendor}</TableCell>
                    <TableCell>
                      {r.isOverBudget ? (
                        <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">On Budget</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No cost data matches your filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}
