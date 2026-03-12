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

    // Verify caller is platform_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "platform_admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to_email } = await req.json();
    if (!to_email) {
      return new Response(JSON.stringify({ error: "to_email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
    if (!postmarkToken) {
      return new Response(
        JSON.stringify({ success: false, error: "POSTMARK_SERVER_TOKEN is not configured. Save your server token first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider settings for from email
    const { data: providerSettings } = await supabase
      .from("email_provider_settings")
      .select("*")
      .eq("provider_name", "postmark")
      .maybeSingle();

    const fromEmail = providerSettings?.from_email || "noreply@example.com";
    const fromName = providerSettings?.from_name || "Recon Pulse";
    const messageStream = providerSettings?.message_stream || "outbound";

    const postmarkRes = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
      body: JSON.stringify({
        From: `${fromName} <${fromEmail}>`,
        To: to_email,
        Subject: "✅ Recon Pulse – Postmark Test Email",
        HtmlBody: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: #0d9488; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">✅ Test Email Successful</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                Your Postmark integration is configured correctly.
              </p>
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">
                <strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;<br/>
                <strong>Stream:</strong> ${messageStream}<br/>
                <strong>Sent at:</strong> ${new Date().toISOString()}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is a test email from Recon Pulse.
              </p>
            </div>
          </div>
        `,
        MessageStream: messageStream,
        Tag: "test",
      }),
    });

    const postmarkData = await postmarkRes.json();

    if (postmarkRes.ok) {
      return new Response(
        JSON.stringify({ success: true, messageId: postmarkData.MessageID }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: postmarkData.Message || "Postmark API error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
