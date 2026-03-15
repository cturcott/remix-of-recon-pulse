import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Bell, Save, Users, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface StageRule {
  id?: string;
  workflow_stage_id: string;
  stage_name: string;
  notifications_enabled: boolean;
  reminder_enabled: boolean;
  reminder_after_minutes: number;
  escalation_enabled: boolean;
  escalation_after_minutes: number;
  recipients: { user_id: string; recipient_type: string }[];
}

export default function WorkflowNotifications() {
  const { currentDealership, loading: dealershipLoading } = useDealership();
  const { user, isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");

  const [rules, setRules] = useState<StageRule[]>([]);
  const [saving, setSaving] = useState(false);

  // Get stages
  const { data: stages = [], isLoading: stagesLoading, error: stagesError } = useQuery({
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

  // Get existing rules
  const { data: existingRules = [], isLoading: rulesLoading, error: rulesError } = useQuery({
    queryKey: ["notification-rules", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("stage_notification_rules")
        .select("*")
        .eq("dealership_id", currentDealership.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  // Get existing recipients
  const { data: existingRecipients = [], isLoading: recipientsLoading, error: recipientsError } = useQuery({
    queryKey: ["notification-recipients", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership || existingRules.length === 0) return [];
      const ruleIds = existingRules.map((r) => r.id);
      const { data, error } = await supabase
        .from("stage_notification_rule_recipients")
        .select("*")
        .in("stage_notification_rule_id", ruleIds);
      if (error) throw error;
      return data;
    },
    enabled: existingRules.length > 0,
  });

  // Get team members
  const { data: teamMembers = [], isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ["team-for-notifications", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data: assignments } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", currentDealership.id);
      if (!assignments || assignments.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, status")
        .in("user_id", assignments.map((a) => a.user_id))
        .eq("status", "active");
      return profiles ?? [];
    },
    enabled: !!currentDealership,
  });

  // Build rules from stages + existing data
  useEffect(() => {
    if (stages.length === 0) return;
    const builtRules: StageRule[] = stages.map((stage: any) => {
      const existing = existingRules.find((r) => r.workflow_stage_id === stage.id);
      const ruleRecipients = existing
        ? existingRecipients.filter((r) => r.stage_notification_rule_id === existing.id)
        : [];
      return {
        id: existing?.id,
        workflow_stage_id: stage.id,
        stage_name: stage.name,
        notifications_enabled: existing?.notifications_enabled ?? false,
        reminder_enabled: existing?.reminder_enabled ?? false,
        reminder_after_minutes: existing?.reminder_after_minutes ?? 120,
        escalation_enabled: existing?.escalation_enabled ?? false,
        escalation_after_minutes: existing?.escalation_after_minutes ?? 360,
        recipients: ruleRecipients.map((r) => ({
          user_id: r.user_id,
          recipient_type: r.recipient_type,
        })),
      };
    });
    setRules(builtRules);
  }, [stages, existingRules, existingRecipients]);

  const updateRule = (idx: number, updates: Partial<StageRule>) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], ...updates };
    setRules(updated);
  };

  const toggleRecipient = (ruleIdx: number, userId: string, type: string) => {
    const rule = rules[ruleIdx];
    const existing = rule.recipients.find((r) => r.user_id === userId && r.recipient_type === type);
    let newRecipients;
    if (existing) {
      newRecipients = rule.recipients.filter((r) => !(r.user_id === userId && r.recipient_type === type));
    } else {
      newRecipients = [...rule.recipients, { user_id: userId, recipient_type: type }];
    }
    updateRule(ruleIdx, { recipients: newRecipients });
  };

  const handleSave = async () => {
    if (!currentDealership) return;
    setSaving(true);
    try {
      for (const rule of rules) {
        // Upsert rule
        if (rule.id) {
          await supabase.from("stage_notification_rules").update({
            notifications_enabled: rule.notifications_enabled,
            reminder_enabled: rule.reminder_enabled,
            reminder_after_minutes: rule.reminder_after_minutes,
            escalation_enabled: rule.escalation_enabled,
            escalation_after_minutes: rule.escalation_after_minutes,
            updated_by_user_id: user?.id,
          }).eq("id", rule.id);

          // Replace recipients
          await supabase.from("stage_notification_rule_recipients")
            .delete()
            .eq("stage_notification_rule_id", rule.id);

          if (rule.recipients.length > 0) {
            await supabase.from("stage_notification_rule_recipients").insert(
              rule.recipients.map((r) => ({
                stage_notification_rule_id: rule.id!,
                user_id: r.user_id,
                recipient_type: r.recipient_type,
              }))
            );
          }
        } else {
          // Insert new rule
          const { data: newRule } = await supabase.from("stage_notification_rules").insert({
            dealership_id: currentDealership.id,
            workflow_stage_id: rule.workflow_stage_id,
            notifications_enabled: rule.notifications_enabled,
            reminder_enabled: rule.reminder_enabled,
            reminder_after_minutes: rule.reminder_after_minutes,
            escalation_enabled: rule.escalation_enabled,
            escalation_after_minutes: rule.escalation_after_minutes,
            updated_by_user_id: user?.id,
          }).select().single();

          if (newRule && rule.recipients.length > 0) {
            await supabase.from("stage_notification_rule_recipients").insert(
              rule.recipients.map((r) => ({
                stage_notification_rule_id: newRule.id,
                user_id: r.user_id,
                recipient_type: r.recipient_type,
              }))
            );
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      queryClient.invalidateQueries({ queryKey: ["notification-recipients"] });
      toast.success("Notification settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };


  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflow Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure who gets notified when vehicles move through recon stages
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDealershipAdmin} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save All
        </Button>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Stage Rules */}
        <section>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Stage Notification Rules
          </h2>

          <div className="space-y-2">
            {rules.map((rule, idx) => {
              const isExpanded = expandedStage === rule.workflow_stage_id;
              const primaryCount = rule.recipients.filter((r) => r.recipient_type === "primary").length;
              const escalationCount = rule.recipients.filter((r) => r.recipient_type === "escalation").length;

              return (
                <div key={rule.workflow_stage_id} className="rounded-lg border border-border bg-card overflow-hidden">
                  {/* Stage Header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedStage(isExpanded ? null : rule.workflow_stage_id)}
                  >
                    <Switch
                      checked={rule.notifications_enabled}
                      onCheckedChange={(v) => { updateRule(idx, { notifications_enabled: v }); }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!isDealershipAdmin}
                    />
                    <span className="font-medium text-foreground flex-1">{rule.stage_name}</span>
                    {rule.notifications_enabled && (
                      <div className="flex items-center gap-2">
                        {primaryCount > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" /> {primaryCount}
                          </Badge>
                        )}
                        {rule.reminder_enabled && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" /> {rule.reminder_after_minutes}m
                          </Badge>
                        )}
                        {rule.escalation_enabled && (
                          <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3" /> {rule.escalation_after_minutes}m
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Config */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/20">
                      {/* Recipients */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Primary Recipients</Label>
                        <div className="space-y-1.5">
                          {teamMembers.map((m: any) => {
                            const isSelected = rule.recipients.some(
                              (r) => r.user_id === m.user_id && r.recipient_type === "primary"
                            );
                            return (
                              <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRecipient(idx, m.user_id, "primary")}
                                  disabled={!isDealershipAdmin}
                                />
                                <span className="text-foreground">{m.first_name} {m.last_name}</span>
                                <span className="text-muted-foreground text-xs">({m.email})</span>
                              </label>
                            );
                          })}
                          {teamMembers.length === 0 && (
                            <p className="text-xs text-muted-foreground">No team members assigned to this dealership</p>
                          )}
                        </div>
                      </div>

                      {/* Escalation Recipients */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Escalation Recipients</Label>
                        <div className="space-y-1.5">
                          {teamMembers.map((m: any) => {
                            const isSelected = rule.recipients.some(
                              (r) => r.user_id === m.user_id && r.recipient_type === "escalation"
                            );
                            return (
                              <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRecipient(idx, m.user_id, "escalation")}
                                  disabled={!isDealershipAdmin}
                                />
                                <span className="text-foreground">{m.first_name} {m.last_name}</span>
                                <span className="text-muted-foreground text-xs">({m.email})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timing */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.reminder_enabled}
                              onCheckedChange={(v) => updateRule(idx, { reminder_enabled: v })}
                              disabled={!isDealershipAdmin}
                            />
                            <Label className="text-sm">Reminder</Label>
                          </div>
                          {rule.reminder_enabled && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">After (minutes)</Label>
                              <Input
                                type="number"
                                value={rule.reminder_after_minutes}
                                onChange={(e) => updateRule(idx, { reminder_after_minutes: parseInt(e.target.value) || 0 })}
                                className="h-8"
                                disabled={!isDealershipAdmin}
                              />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.escalation_enabled}
                              onCheckedChange={(v) => updateRule(idx, { escalation_enabled: v })}
                              disabled={!isDealershipAdmin}
                            />
                            <Label className="text-sm">Escalation</Label>
                          </div>
                          {rule.escalation_enabled && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">After (minutes)</Label>
                              <Input
                                type="number"
                                value={rule.escalation_after_minutes}
                                onChange={(e) => updateRule(idx, { escalation_after_minutes: parseInt(e.target.value) || 0 })}
                                className="h-8"
                                disabled={!isDealershipAdmin}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
