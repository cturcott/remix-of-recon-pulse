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

    const payload = await req.json();
    const recordType = payload.RecordType;

    if (!recordType) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = payload.MessageID;
    if (!messageId) {
      return new Response(JSON.stringify({ status: "ignored", reason: "No MessageID" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the notification event by provider message ID
    const { data: event } = await supabase
      .from("notification_events")
      .select("id")
      .eq("provider_message_id", messageId)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ status: "ignored", reason: "Event not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = payload.Recipient || payload.Email;

    if (recordType === "Delivery") {
      // Update event status
      await supabase.from("notification_events").update({ status: "delivered" }).eq("id", event.id);

      // Update recipient
      if (recipientEmail) {
        await supabase
          .from("notification_event_recipients")
          .update({
            delivery_status: "delivered",
            delivered_at: payload.DeliveredAt || new Date().toISOString(),
          })
          .eq("notification_event_id", event.id)
          .eq("recipient_email", recipientEmail);
      }
    } else if (recordType === "Bounce") {
      await supabase.from("notification_events").update({
        status: "bounced",
        error_message: payload.Description || payload.Details,
      }).eq("id", event.id);

      if (recipientEmail) {
        await supabase
          .from("notification_event_recipients")
          .update({
            delivery_status: "bounced",
            bounce_type: payload.Type || payload.TypeCode?.toString(),
          })
          .eq("notification_event_id", event.id)
          .eq("recipient_email", recipientEmail);
      }
    } else if (recordType === "Open") {
      // Don't downgrade delivered → opened in event status, just track on recipient
      if (recipientEmail) {
        await supabase
          .from("notification_event_recipients")
          .update({
            opened_at: payload.ReceivedAt || new Date().toISOString(),
          })
          .eq("notification_event_id", event.id)
          .eq("recipient_email", recipientEmail);
      }
    }

    return new Response(
      JSON.stringify({ status: "processed", recordType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
