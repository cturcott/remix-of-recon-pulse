import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { vehicle_id, to_stage_id, dealership_id, triggered_by_user_id } = await req.json();

    if (!vehicle_id || !to_stage_id || !dealership_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email provider settings
    const { data: providerSettings } = await supabase
      .from("email_provider_settings")
      .select("*")
      .eq("provider_name", "postmark")
      .single();

    if (!providerSettings?.integration_enabled) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Email integration not enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
    if (!postmarkToken) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Postmark server token not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get notification rule for this stage
    const { data: rule } = await supabase
      .from("stage_notification_rules")
      .select("*")
      .eq("dealership_id", dealership_id)
      .eq("workflow_stage_id", to_stage_id)
      .eq("notifications_enabled", true)
      .single();

    if (!rule) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "No notification rule for this stage" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipients
    const { data: recipients } = await supabase
      .from("stage_notification_rule_recipients")
      .select("user_id, recipient_type")
      .eq("stage_notification_rule_id", rule.id);

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profiles for recipients
    const userIds = recipients.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, status")
      .in("user_id", userIds)
      .eq("status", "active");

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "No active recipient profiles found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get vehicle details
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicle_id)
      .single();

    // Get stage name
    const { data: stage } = await supabase
      .from("workflow_stages")
      .select("name")
      .eq("id", to_stage_id)
      .single();

    // Get dealership name
    const { data: dealership } = await supabase
      .from("dealerships")
      .select("name")
      .eq("id", dealership_id)
      .single();

    // Deduplicate by email
    const uniqueEmails = new Map<string, typeof profiles[0]>();
    for (const p of profiles) {
      if (p.email && !uniqueEmails.has(p.email)) {
        uniqueEmails.set(p.email, p);
      }
    }

    // Create notification event
    const { data: event, error: eventError } = await supabase
      .from("notification_events")
      .insert({
        dealership_id,
        vehicle_id,
        workflow_stage_id: to_stage_id,
        event_type: "stage_entry",
        triggered_by_user_id,
        status: "pending",
        provider: "postmark",
        template_key: rule.template_key_stage_entry || "vehicle-entered-stage",
        tag: "stage-entry",
        metadata_json: {
          dealershipName: dealership?.name,
          vehicleId: vehicle_id,
          stockNumber: vehicle?.stock_number,
          vin: vehicle?.vin,
          stageName: stage?.name,
        },
      })
      .select()
      .single();

    if (eventError) throw eventError;

    const fromEmail = providerSettings.from_email || Deno.env.get("POSTMARK_FROM_EMAIL") || "noreply@example.com";
    const fromName = providerSettings.from_name || "Recon Pulse";
    const messageStream = providerSettings.message_stream || "outbound";

    const vehicleLabel = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
    const stockLabel = vehicle?.stock_number || vehicle?.vin?.slice(-6) || "N/A";

    const results = [];

    for (const [email, profile] of uniqueEmails) {
      const subject = `Recon Pulse: Stock #${stockLabel} is now in ${stage?.name || "a new stage"}`;

      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0d9488; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">🚗 Vehicle Stage Update</h2>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${dealership?.name || "Your Dealership"}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
              Hi ${profile.first_name || "Team"},
            </p>
            <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
              <strong>${vehicleLabel}</strong> (Stock #${stockLabel}) has moved into <strong>${stage?.name || "a new stage"}</strong> and needs your attention.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vehicle</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${vehicleLabel}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Stock #</td><td style="padding: 8px 0; font-size: 14px;">${stockLabel}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">VIN</td><td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${vehicle?.vin || "N/A"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mileage</td><td style="padding: 8px 0; font-size: 14px;">${vehicle?.mileage?.toLocaleString() || "N/A"} mi</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Current Stage</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #0d9488;">${stage?.name || "N/A"}</td></tr>
            </table>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/vehicle/${vehicle_id}"
                 style="display: inline-block; background: #0d9488; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Open Vehicle in Recon Pulse
              </a>
            </div>
            <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
              This is an automated notification from Recon Pulse.
            </p>
          </div>
        </div>
      `;

      try {
        const postmarkRes = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": postmarkToken,
          },
          body: JSON.stringify({
            From: `${fromName} <${fromEmail}>`,
            To: email,
            Subject: subject,
            HtmlBody: htmlBody,
            MessageStream: messageStream,
            Tag: "stage-entry",
            Metadata: {
              dealershipId: dealership_id,
              vehicleId: vehicle_id,
              stageId: to_stage_id,
              notificationEventId: event.id,
            },
          }),
        });

        const postmarkData = await postmarkRes.json();

        // Log recipient
        await supabase.from("notification_event_recipients").insert({
          notification_event_id: event.id,
          user_id: profile.user_id,
          recipient_email: email,
          recipient_name: `${profile.first_name} ${profile.last_name}`,
          delivery_status: postmarkRes.ok ? "sent" : "failed",
        });

        results.push({
          email,
          status: postmarkRes.ok ? "sent" : "failed",
          messageId: postmarkData.MessageID,
          error: postmarkData.ErrorCode ? postmarkData.Message : null,
        });

        // Update event with provider message ID
        if (postmarkRes.ok && postmarkData.MessageID) {
          await supabase.from("notification_events").update({
            status: "sent",
            provider_message_id: postmarkData.MessageID,
          }).eq("id", event.id);
        }
      } catch (sendError) {
        await supabase.from("notification_event_recipients").insert({
          notification_event_id: event.id,
          user_id: profile.user_id,
          recipient_email: email,
          recipient_name: `${profile.first_name} ${profile.last_name}`,
          delivery_status: "failed",
        });

        await supabase.from("notification_events").update({
          status: "failed",
          error_message: sendError.message,
        }).eq("id", event.id);

        results.push({ email, status: "failed", error: sendError.message });
      }
    }

    return new Response(
      JSON.stringify({ status: "completed", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
