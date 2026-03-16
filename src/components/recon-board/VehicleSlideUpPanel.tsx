import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Send, MessageSquare, ArrowRight, User, Clock, Car,
  ExternalLink, Maximize2, MapPin, Palette, Gauge,
  Wrench, Check, X, AlertCircle, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Vehicle {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number;
  stock_number: string | null;
  exterior_color: string | null;
  interior_color?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
  body_style?: string | null;
  lot_location?: string | null;
  created_at: string;
  dealership_id: string;
  assigned_to: string | null;
  current_stage_id?: string | null;
}

interface VehicleSlideUpPanelProps {
  vehicle: Vehicle | null;
  stages: { id: string; name: string; sort_order: number }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeName?: string | null;
}

export default function VehicleSlideUpPanel({
  vehicle,
  stages,
  open,
  onOpenChange,
  assigneeName,
}: VehicleSlideUpPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["vehicle-notes", vehicle?.id],
    queryFn: async () => {
      if (!vehicle) return [];
      const { data, error } = await supabase
        .from("vehicle_notes")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!vehicle && open,
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ["vehicle-stage-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle) return [];
      const { data, error } = await supabase
        .from("vehicle_stage_history")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!vehicle && open,
  });

  const { data: repairItems = [] } = useQuery({
    queryKey: ["vehicle-repair-items", vehicle?.id],
    queryFn: async () => {
      if (!vehicle) return [];
      const { data, error } = await supabase
        .from("repair_items")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!vehicle && open,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!vehicle) return;
      const { error } = await supabase.from("vehicle_notes").insert({
        vehicle_id: vehicle.id,
        dealership_id: vehicle.dealership_id,
        author_id: user?.id,
        note_type: "note",
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["vehicle-notes", vehicle?.id] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-notes-count"] });
      toast.success("Note added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmitNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed);
  };

  if (!vehicle) return null;

  const currentStage = stages.find((s) => s.id === vehicle.current_stage_id);
  const daysInRecon = Math.floor(
    (Date.now() - new Date(vehicle.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeline = [
    ...notes.map((n: any) => ({
      type: "note" as const,
      date: new Date(n.created_at),
      content: n.content,
      id: n.id,
    })),
    ...stageHistory.map((h: any) => {
      const fromStage = stages.find((s) => s.id === h.from_stage_id);
      const toStage = stages.find((s) => s.id === h.to_stage_id);
      return {
        type: "stage_change" as const,
        date: new Date(h.changed_at),
        content: `${fromStage?.name ?? "Start"} → ${toStage?.name ?? "Unknown"}`,
        note: h.note,
        id: h.id,
      };
    }),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] flex flex-col overflow-hidden focus:outline-none">
        <DrawerHeader className="flex items-start justify-between gap-3 pb-2">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-lg font-bold text-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </DrawerTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {vehicle.trim && (
                <span className="text-sm text-muted-foreground">{vehicle.trim}</span>
              )}
              <span className="text-sm text-muted-foreground font-mono">
                {vehicle.stock_number ? `#${vehicle.stock_number}` : vehicle.vin}
              </span>
              {currentStage && (
                <Badge variant="secondary" className="text-xs">
                  {currentStage.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => {
              onOpenChange(false);
              navigate(`/vehicle/${vehicle.id}`);
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Full Page
          </Button>
        </DrawerHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-auto">
          <div className="px-4 pb-6 space-y-5">
            {/* Vehicle details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DetailItem icon={<Gauge className="h-3.5 w-3.5" />} label="Mileage" value={`${vehicle.mileage.toLocaleString()} mi`} />
              <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Days in Recon" value={`${daysInRecon}d`} />
              {vehicle.exterior_color && (
                <DetailItem icon={<Palette className="h-3.5 w-3.5" />} label="Ext. Color" value={vehicle.exterior_color} />
              )}
              {assigneeName ? (
                <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Assigned to" value={assigneeName} />
              ) : (
                <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Assigned to" value="Unassigned" muted />
              )}
              {vehicle.lot_location && (
                <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Lot" value={vehicle.lot_location} />
              )}
              {vehicle.body_style && (
                <DetailItem icon={<Car className="h-3.5 w-3.5" />} label="Body" value={vehicle.body_style} />
              )}
            </div>

            <div className="text-xs text-muted-foreground font-mono break-all">
              VIN: {vehicle.vin}
            </div>

            <Separator />

            {/* Service / Repair Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Service Items
                {repairItems.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-1">{repairItems.length}</Badge>
                )}
              </h4>
              {repairItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No service items</p>
              ) : (
                <div className="space-y-2">
                  {repairItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 rounded-md border border-border p-2.5"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.status === "approved" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {item.status === "denied" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
                            <X className="h-3 w-3 text-destructive" />
                          </div>
                        )}
                        {item.status === "pending" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/10">
                            <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${
                              item.status === "approved"
                                ? "border-green-500/50 text-green-600 dark:text-green-400"
                                : item.status === "denied"
                                ? "border-destructive/50 text-destructive"
                                : "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {item.category && <span>{item.category}</span>}
                          {item.estimated_cost != null && (
                            <span className="flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3" />
                              {Number(item.estimated_cost).toLocaleString()}
                            </span>
                          )}
                          {item.vendor_name && <span>{item.vendor_name}</span>}
                        </div>
                        {item.status === "denied" && item.denial_reason && (
                          <p className="text-xs text-destructive/80 mt-1">Reason: {item.denial_reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Note input */}
            <div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[60px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitNote();
                }}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted-foreground">⌘+Enter to send</span>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleSubmitNote}
                  disabled={!newNote.trim() || addNote.isPending}
                >
                  <Send className="h-3 w-3" />
                  Send
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activity
              </h4>
              {timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                timeline.map((item) => (
                  <div key={item.id} className="flex gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {item.type === "note" ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <MessageSquare className="h-3 w-3 text-primary" />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                          <ArrowRight className="h-3 w-3 text-accent-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">{item.content}</p>
                      {"note" in item && item.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(item.date, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function DetailItem({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium truncate ${muted ? "text-muted-foreground italic" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
