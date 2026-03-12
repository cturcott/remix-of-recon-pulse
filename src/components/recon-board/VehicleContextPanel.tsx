import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  X, Send, MessageSquare, ArrowRight, User, Clock, Car,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

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
  created_at: string;
  dealership_id: string;
  assigned_to: string | null;
}

interface VehicleContextPanelProps {
  vehicle: Vehicle;
  stages: { id: string; name: string; sort_order: number }[];
  onClose: () => void;
}

export default function VehicleContextPanel({
  vehicle,
  stages,
  onClose,
}: VehicleContextPanelProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ["vehicle-notes", vehicle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_notes")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch stage history
  const { data: stageHistory = [] } = useQuery({
    queryKey: ["vehicle-stage-history", vehicle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_stage_history")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async (content: string) => {
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-notes", vehicle.id] });
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

  // Merge notes and stage history into a timeline
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
    <div className="flex h-full w-80 flex-col border-l border-border bg-card shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            {vehicle.stock_number || vehicle.vin}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
            <Link to={`/vehicle/${vehicle.id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Note input */}
      <div className="border-b border-border p-3">
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

      {/* Activity timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
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
      </ScrollArea>
    </div>
  );
}
