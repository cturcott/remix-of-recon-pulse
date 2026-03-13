import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Mail, TestTube, Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export default function EmailSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["email-provider-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_provider_settings")
        .select("*")
        .eq("provider_name", "postmark")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("Recon Pulse");
  const [messageStream, setMessageStream] = useState("outbound");
  const [tokenStatus, setTokenStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.integration_enabled);
      setFromEmail(settings.from_email ?? "");
      setFromName(settings.from_name ?? "Recon Pulse");
      setMessageStream(settings.message_stream ?? "outbound");
    }
  }, [settings]);

  const handleValidateToken = async () => {
    setValidating(true);
    setTokenStatus("unknown");
    try {
      const { data, error } = await supabase.functions.invoke("manage-postmark-token", {
        body: { token: "validate-existing" },
      });
      if (error) throw error;
      if (data?.success) {
        setTokenStatus("valid");
        toast.success(`Token valid — server: ${data.serverName}`);
      } else {
        setTokenStatus("invalid");
        toast.error(data?.error || "Token validation failed");
      }
    } catch (err: any) {
      setTokenStatus("invalid");
      toast.error(err.message || "Failed to validate token");
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        provider_name: "postmark" as const,
        integration_enabled: enabled,
        from_email: fromEmail || null,
        from_name: fromName || "Recon Pulse",
        message_stream: messageStream || "outbound",
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("email_provider_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_provider_settings")
          .insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["email-provider-settings"] });
      toast.success("Email settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Enter a test email address");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-postmark", {
        body: { to_email: testEmail },
      });
      if (error) throw error;
      if (data?.success) {
        setTestResult({ success: true, message: `Test email sent! Message ID: ${data.messageId}` });
      } else {
        setTestResult({ success: false, message: data?.error || "Test failed" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to send test email" });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Email Provider Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure Postmark for stage notifications across all dealerships</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Integration Toggle */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Postmark Integration</h2>
                <p className="text-sm text-muted-foreground">Enable email notifications via Postmark</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={enabled ? "default" : "secondary"}>
                {enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
        </section>

        {/* Server Token */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Server API Token</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The Postmark Server API Token is stored as a secure backend secret (<code className="text-xs bg-muted px-1 py-0.5 rounded">POSTMARK_SERVER_TOKEN</code>).
            To update it, use the Lovable secrets manager. You can validate the current token below.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleValidateToken} disabled={validating} variant="outline" size="sm">
              {validating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Validate Current Token
            </Button>
            {tokenStatus === "valid" && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Valid
              </Badge>
            )}
            {tokenStatus === "invalid" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Invalid
              </Badge>
            )}
          </div>
        </section>

        {/* Sender Settings */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sender Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From Email</Label>
              <Input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="notifications@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground">Must be a verified Sender Signature in Postmark</p>
            </div>
            <div className="space-y-1.5">
              <Label>From Name</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Recon Pulse"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Message Stream</Label>
              <Input
                value={messageStream}
                onChange={(e) => setMessageStream(e.target.value)}
                placeholder="outbound"
              />
              <p className="text-xs text-muted-foreground">Postmark message stream ID (default: outbound)</p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Settings
          </Button>
        </div>

        {/* Test Section */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TestTube className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Test Email Delivery</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Send a test email to verify your Postmark configuration is working correctly. Save your settings first.
          </p>
          <div className="flex gap-3">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <TestTube className="h-4 w-4 mr-1" />}
              Send Test
            </Button>
          </div>
          {testResult && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 ${testResult.success ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{testResult.message}</p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
