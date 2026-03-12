import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Car, Clock, Wrench, Plus, Check, X, DollarSign,
  ChevronRight, Loader2, Trash2, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";

const CATEGORIES = ["Mechanical", "Electrical", "Cosmetic", "Body/Paint", "Glass", "Interior", "Tires/Wheels", "Sublet", "Detail", "Other"];

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDealership } = useDealership();
  const { user, roles, isPlatformAdmin } = useAuth();
  const queryClient = useQueryClient();

  const canApprove = isPlatformAdmin || roles.includes("dealership_admin") || roles.includes("recon_manager");

  // Vehicle data
  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Workflow stages
  const { data: stages = [] } = useQuery({
    queryKey: ["workflow-stages", vehicle?.dealership_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("dealership_id", vehicle!.dealership_id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!vehicle?.dealership_id,
  });

  // Stage history
  const { data: stageHistory = [] } = useQuery({
    queryKey: ["stage-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_stage_history")
        .select("*")
        .eq("vehicle_id", id!)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Repair items
  const { data: repairItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["repair-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_items")
        .select("*")
        .eq("vehicle_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Add item form
  const [addOpen, setAddOpen] = useState(false);
  const [itemDesc, setItemDesc] = useState("");
  const [itemCategory, setItemCategory] = useState("Mechanical");
  const [itemCost, setItemCost] = useState("");
  const [itemVendor, setItemVendor] = useState("");
  const [denialId, setDenialId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState("");

  const addItem = useMutation({
    mutationFn: async () => {
      if (!vehicle || !currentDealership) throw new Error("Missing context");
      const { error } = await supabase.from("repair_items").insert({
        vehicle_id: vehicle.id,
        dealership_id: vehicle.dealership_id,
        stage_id: vehicle.current_stage_id,
        description: itemDesc,
        category: itemCategory,
        estimated_cost: itemCost ? parseFloat(itemCost) : null,
        vendor_name: itemVendor || null,
        status: "pending",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      toast.success("Work item added");
      setItemDesc(""); setItemCost(""); setItemVendor(""); setAddOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("repair_items").update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      toast.success("Item approved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const denyItem = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      const { error } = await supabase.from("repair_items").update({
        status: "denied",
        denied_by: user?.id,
        denied_at: new Date().toISOString(),
        denial_reason: reason || null,
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      setDenialId(null); setDenialReason("");
      toast.success("Item denied");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("repair_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      toast.success("Item removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveAll = useMutation({
    mutationFn: async () => {
      const pending = repairItems.filter((i) => i.status === "pending");
      for (const item of pending) {
        await supabase.from("repair_items").update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      toast.success("All pending items approved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const denyAll = useMutation({
    mutationFn: async () => {
      const pending = repairItems.filter((i) => i.status === "pending");
      for (const item of pending) {
        await supabase.from("repair_items").update({
          status: "denied",
          denied_by: user?.id,
          denied_at: new Date().toISOString(),
        }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-items", id] });
      toast.success("All pending items denied");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loadingVehicle) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96 text-muted-foreground">Loading vehicle...</div>
      </AppLayout>
    );
  }

  if (!vehicle) {
    return (
      <AppLayout>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Vehicle not found</p>
        </div>
      </AppLayout>
    );
  }

  const currentStage = stages.find((s) => s.id === vehicle.current_stage_id);
  const daysInRecon = Math.floor((Date.now() - new Date(vehicle.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const pendingItems = repairItems.filter((i) => i.status === "pending");
  const approvedItems = repairItems.filter((i) => i.status === "approved");
  const deniedItems = repairItems.filter((i) => i.status === "denied");
  const totalEstimated = repairItems.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0);
  const totalApproved = approvedItems.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "denied": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Approved</Badge>;
      case "denied": return <Badge variant="destructive" className="text-xs">Denied</Badge>;
      default: return <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">Pending</Badge>;
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column — Vehicle Info */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Car className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
            </div>
            {vehicle.trim && <p className="text-sm text-muted-foreground mb-3">{vehicle.trim}</p>}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">VIN</span><span className="font-mono text-foreground">{vehicle.vin}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stock #</span><span className="text-foreground">{vehicle.stock_number || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mileage</span><span className="text-foreground">{vehicle.mileage?.toLocaleString()} mi</span></div>
              {vehicle.exterior_color && <div className="flex justify-between"><span className="text-muted-foreground">Ext. Color</span><span className="text-foreground">{vehicle.exterior_color}</span></div>}
              {vehicle.interior_color && <div className="flex justify-between"><span className="text-muted-foreground">Int. Color</span><span className="text-foreground">{vehicle.interior_color}</span></div>}
              {vehicle.acv && <div className="flex justify-between"><span className="text-muted-foreground">ACV</span><span className="text-foreground">${Number(vehicle.acv).toLocaleString()}</span></div>}
              {vehicle.acquisition_source && <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground">{vehicle.acquisition_source}</span></div>}
            </div>
          </div>

          {/* Recon Status */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3">Recon Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stage</span>
                <Badge variant="secondary" className="text-xs">{currentStage?.name ?? "—"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days in Recon</span>
                <span className={`font-semibold ${daysInRecon > 10 ? "text-destructive" : "text-foreground"}`}>{daysInRecon}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-xs">{vehicle.status === "in_recon" ? "In Recon" : vehicle.status}</Badge>
              </div>
            </div>

            {/* Stage Progress */}
            <div className="mt-4 space-y-1">
              {stages.map((stage, idx) => {
                const historyEntry = stageHistory.find((h) => h.to_stage_id === stage.id);
                const isCurrent = stage.id === vehicle.current_stage_id;
                const isPast = historyEntry && !isCurrent && stages.findIndex((s) => s.id === vehicle.current_stage_id) > idx;
                return (
                  <div key={stage.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                    isCurrent ? "bg-primary/10 text-primary font-semibold" : isPast ? "text-muted-foreground" : "text-muted-foreground/50"
                  }`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      isCurrent ? "bg-primary" : isPast ? "bg-muted-foreground" : "bg-border"
                    }`} />
                    <span className="flex-1">{stage.name}</span>
                    {historyEntry && (
                      <span className="text-[10px]">
                        {new Date(historyEntry.changed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3">Cost Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Estimated</span>
                <span className="font-medium text-foreground">${totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Approved</span>
                <span className="font-medium text-emerald-600">${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="text-foreground">{repairItems.length} ({pendingItems.length} pending)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Work Items */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card">
            {/* Work Items Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Service Work Items</h2>
                {pendingItems.length > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                    {pendingItems.length} pending approval
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {canApprove && pendingItems.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => denyAll.mutate()} disabled={denyAll.isPending} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <X className="h-3.5 w-3.5 mr-1" /> Deny All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => approveAll.mutate()} disabled={approveAll.isPending} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve All
                    </Button>
                  </>
                )}
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Work Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Description *</Label>
                        <Textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Describe the repair or service needed..." rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Select value={itemCategory} onValueChange={setItemCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Estimated Cost</Label>
                          <Input type="number" value={itemCost} onChange={(e) => setItemCost(e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Vendor (optional)</Label>
                        <Input value={itemVendor} onChange={(e) => setItemVendor(e.target.value)} placeholder="Vendor or sublet name" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={() => addItem.mutate()} disabled={!itemDesc || addItem.isPending}>
                          {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Work Items List */}
            {loadingItems ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Loading work items...</div>
            ) : repairItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Wrench className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No work items yet</p>
                <p className="text-xs text-muted-foreground">Service department can add itemized repair work here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {repairItems.map((item) => (
                  <div key={item.id} className={`px-5 py-4 ${item.status === "denied" ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-medium text-foreground ${item.status === "denied" ? "line-through" : ""}`}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] font-normal">{item.category}</Badge>
                              {item.vendor_name && (
                                <span className="text-xs text-muted-foreground">Vendor: {item.vendor_name}</span>
                              )}
                              {item.denial_reason && (
                                <span className="text-xs text-destructive">Reason: {item.denial_reason}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.estimated_cost && (
                              <span className="text-sm font-medium text-foreground flex items-center gap-0.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                {Number(item.estimated_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {getStatusBadge(item.status)}
                          </div>
                        </div>

                        {/* Action buttons for pending items */}
                        {item.status === "pending" && (
                          <div className="flex items-center gap-2 mt-3">
                            {canApprove && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                  onClick={() => approveItem.mutate(item.id)}
                                  disabled={approveItem.isPending}
                                >
                                  <Check className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => setDenialId(item.id)}
                                >
                                  <X className="h-3 w-3 mr-1" /> Deny
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => deleteItem.mutate(item.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals footer */}
            {repairItems.length > 0 && (
              <div className="border-t border-border px-5 py-3 bg-muted/30 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {approvedItems.length} approved · {pendingItems.length} pending · {deniedItems.length} denied
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Est: <span className="font-medium text-foreground">${totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Approved: <span className="font-medium text-emerald-600">${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {vehicle.notes && (
            <div className="rounded-xl border border-border bg-card p-5 mt-4">
              <h3 className="font-semibold text-foreground mb-2">Intake Notes</h3>
              <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Denial Reason Dialog */}
      <Dialog open={!!denialId} onOpenChange={(o) => { if (!o) { setDenialId(null); setDenialReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Work Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea value={denialReason} onChange={(e) => setDenialReason(e.target.value)} placeholder="Why is this being denied?" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDenialId(null); setDenialReason(""); }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => denialId && denyItem.mutate({ itemId: denialId, reason: denialReason })}
                disabled={denyItem.isPending}
              >
                Deny Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
