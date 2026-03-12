import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AddVehicleDialog from "@/components/AddVehicleDialog";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Search, Clock, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortField = "created_at" | "year" | "make" | "mileage" | "stock_number";
type SortDir = "asc" | "desc";

export default function Vehicles() {
  const { currentDealership } = useDealership();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: stages = [] } = useQuery({
    queryKey: ["workflow-stages", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles-list", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  const getDays = (createdAt: string) =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_recon": return "default";
      case "frontline_ready": return "secondary";
      case "wholesale": return "outline";
      case "sold": return "secondary";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_recon": return "In Recon";
      case "frontline_ready": return "Frontline Ready";
      case "wholesale": return "Wholesale";
      case "sold": return "Sold";
      default: return status;
    }
  };

  // Filter
  let filtered = vehicles.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (stageFilter !== "all" && v.current_stage_id !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        v.vin?.toLowerCase().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.stock_number?.toLowerCase().includes(q) ||
        String(v.year).includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (aVal == null) aVal = "";
    if (bVal == null) bVal = "";
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} in inventory
          </p>
        </div>
        <AddVehicleDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, make, model, stock #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_recon">In Recon</SelectItem>
            <SelectItem value="frontline_ready">Frontline Ready</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading vehicles...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-16">
          <Car className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No vehicles found</p>
          <p className="text-xs text-muted-foreground">Add a vehicle to get started</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3"><SortHeader field="stock_number">Stock #</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="year">Vehicle</SortHeader></th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">VIN</th>
                  <th className="px-4 py-3"><SortHeader field="mileage">Mileage</SortHeader></th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Color</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Stage</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3"><SortHeader field="created_at">Days</SortHeader></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const stage = stages.find((s: any) => s.id === v.current_stage_id);
                  const days = getDays(v.created_at);
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-foreground">
                        <Link to={`/vehicle/${v.id}`} className="hover:text-primary transition-colors">
                          {v.stock_number || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/vehicle/${v.id}`} className="hover:text-primary transition-colors">
                          <span className="font-medium text-foreground">
                            {v.year} {v.make} {v.model}
                          </span>
                          {v.trim && <span className="text-muted-foreground ml-1">{v.trim}</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.vin}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.mileage?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.exterior_color || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-normal">
                          {stage?.name ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusColor(v.status) as any} className="text-xs">
                          {getStatusLabel(v.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs ${days > 10 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" />
                          {days}d
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
