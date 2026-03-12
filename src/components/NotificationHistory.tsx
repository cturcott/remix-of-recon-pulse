import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  sent: { icon: Mail, label: "Sent", color: "text-blue-600" },
  delivered: { icon: CheckCircle2, label: "Delivered", color: "text-emerald-600" },
  bounced: { icon: XCircle, label: "Bounced", color: "text-destructive" },
  failed: { icon: XCircle, label: "Failed", color: "text-destructive" },
  pending: { icon: Clock, label: "Pending", color: "text-amber-500" },
  opened: { icon: CheckCircle2, label: "Opened", color: "text-emerald-600" },
};

export default function NotificationHistory({ vehicleId }: { vehicleId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["notification-events", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_events")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("triggered_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  const { data: recipientMap = {} } = useQuery({
    queryKey: ["notification-recipients", vehicleId, events.map((e) => e.id).join(",")],
    queryFn: async () => {
      if (events.length === 0) return {};
      const { data, error } = await supabase
        .from("notification_event_recipients")
        .select("*")
        .in("notification_event_id", events.map((e) => e.id));
      if (error) throw error;
      const map: Record<string, typeof data> = {};
      for (const r of data ?? []) {
        if (!map[r.notification_event_id]) map[r.notification_event_id] = [];
        map[r.notification_event_id].push(r);
      }
      return map;
    },
    enabled: events.length > 0,
  });

  if (isLoading) return null;
  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card mt-4">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Notification History</h3>
        <Badge variant="outline" className="text-xs ml-auto">{events.length} events</Badge>
      </div>
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {events.map((event) => {
          const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          const recipients = recipientMap[event.id] ?? [];
          return (
            <div key={event.id} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className="text-xs font-medium text-foreground capitalize">{event.event_type.replace("_", " ")}</span>
                <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(event.triggered_at).toLocaleString()}
                </span>
              </div>
              {recipients.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {recipients.map((r: any) => (
                    <span key={r.id} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {r.recipient_name || r.recipient_email}
                      {r.delivery_status === "bounced" && <span className="text-destructive ml-1">⚠</span>}
                    </span>
                  ))}
                </div>
              )}
              {event.error_message && (
                <p className="text-[10px] text-destructive mt-1">{event.error_message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
