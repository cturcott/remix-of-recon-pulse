import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  FileText, Check, X, DollarSign, Search, Filter,
  Loader2, CheckCircle2, XCircle, Clock, Car, ExternalLink
} from "lucide-react";

type RepairWithVehicle = {
  id: string;
  description: string;
  category: string | null;
  vendor_name: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  status: string;
  created_at: string;
  vehicle_id: string;
  stage_id: string | null;
  created_by: string | null;
  vehicles: { vin: string; stock_number: string | null; year: number | null; make: string | null; model: string | null } | null;
};

const STATUS_FILTERS = ["all", "pending", "approved", "denied"] as const;

export default function Approvals() {
  const { currentDealership } = useDealership();
  const { user, roles, isPlatformAdmin } = useAuth();
  const queryClient = useQueryClient();
  const canApprove = isPlatformAdmin || roles.includes("dealership_admin") || roles.includes("recon_manager");

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [denyingId, setDenyingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["approvals", currentDealership?.id, statusFilter],
    queryFn: async () => {
      if (!currentDealership) return [];
      let query = supabase
        .from("repair_items")
        .select("id, description, category, vendor_name, estimated_cost, actual_cost, status, created_at, vehicle_id, stage_id, created_by, vehicles(vin, stock_number, year, make, model)")
        .eq("dealership_id", currentDealership.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as RepairWithVehicle[];
    },
    enabled: !!currentDealership,
  });

  const filtered = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const v = item.vehicles;
    return (
      item.description.toLowerCase().includes(q) ||
      (item.vendor_name?.toLowerCase().includes(q)) ||
      (v?.vin?.toLowerCase().includes(q)) ||
      (v?.stock_number?.toLowerCase().includes(q)) ||
      (v?.make?.toLowerCase().includes(q)) ||
      (v?.model?.toLowerCase().includes(q))
    );
  });

  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("repair_items")
        .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setSelectedIds(new Set());
      toast.success(`${ids.length} item(s) approved`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const denyMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const { error } = await supabase
        .from("repair_items")
        .update({ status: "denied", denied_by: user?.id, denied_at: new Date().toISOString(), denial_reason: reason || null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setSelectedIds(new Set());
      setDenyDialogOpen(false);
      setDenyReason("");
      setDenyingId(null);
      toast.success(`${ids.length} item(s) denied`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleApprove = (ids: string[]) => approveMutation.mutate(ids);

  const openDenyDialog = (id: string | null) => {
    setDenyingId(id);
    setDenyReason("");
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = () => {
    const ids = denyingId ? [denyingId] : Array.from(selectedIds);
    if (ids.length === 0) return;
    denyMutation.mutate({ ids, reason: denyReason });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const pendingSelected = filtered.filter((i) => selectedIds.has(i.id) && i.status === "pending");

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50"><CheckCircle2 className="h-3 w-3" />Approved</Badge>;
      case "denied": return <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3" />Denied</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const vehicleLabel = (v: RepairWithVehicle["vehicles"]) => {
    if (!v) return "Unknown Vehicle";
    const parts = [v.year, v.make, v.model].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : v.vin;
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Approvals
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white">{pendingCount}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve service work items across all vehicles</p>
        </div>

        {canApprove && pendingSelected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{pendingSelected.length} selected</span>
            <Button size="sm" onClick={() => handleApprove(pendingSelected.map((i) => i.id))} disabled={approveMutation.isPending}>
              <Check className="h-4 w-4 mr-1" />Approve All
            </Button>
            <Button size="sm" variant="destructive" onClick={() => openDenyDialog(null)} disabled={denyMutation.isPending}>
              <X className="h-4 w-4 mr-1" />Deny All
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description, VIN, stock #, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-3 text-primary/40" />
          <p className="text-lg font-medium">No items to review</p>
          <p className="text-sm">{statusFilter === "pending" ? "All service work items have been processed." : "No items match your filters."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {canApprove && statusFilter === "pending" && (
                  <th className="w-10 px-3 py-3">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Est. Cost</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                {canApprove && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  {canApprove && statusFilter === "pending" && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link to={`/vehicle/${item.vehicle_id}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group">
                      <Car className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <div>
                        <p className="font-medium">{vehicleLabel(item.vehicles)}</p>
                        {item.vehicles?.stock_number && (
                          <p className="text-xs text-muted-foreground">Stk# {item.vehicles.stock_number}</p>
                        )}
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground max-w-xs truncate">{item.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.vendor_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {item.estimated_cost != null ? `$${Number(item.estimated_cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                  {canApprove && (
                    <td className="px-4 py-3 text-right">
                      {item.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleApprove([item.id])} disabled={approveMutation.isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openDenyDialog(item.id)} disabled={denyMutation.isPending}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Service Item{denyingId ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {denyingId ? "Provide an optional reason for denying this item." : `Deny ${pendingSelected.length} selected item(s).`}
            </p>
            <Textarea placeholder="Reason for denial (optional)" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDenyConfirm} disabled={denyMutation.isPending}>
                {denyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Deny
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
