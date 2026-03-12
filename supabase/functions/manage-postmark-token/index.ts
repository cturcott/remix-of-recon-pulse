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

    const { token: postmarkToken } = await req.json();
    if (!postmarkToken) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the token against Postmark API
    const validateRes = await fetch("https://api.postmarkapp.com/server", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
    });

    if (!validateRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Postmark token. API validation failed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverInfo = await validateRes.json();

    // Store as a Vault secret using raw SQL via service role
    // We use the Supabase Vault to securely store the token
    const { error: vaultError } = await supabase.rpc("set_postmark_token" as any, {
      _token: postmarkToken,
    });

    // If vault RPC doesn't exist, fall back — the token is already validated
    // The admin should use the secrets management to set POSTMARK_SERVER_TOKEN
    if (vaultError) {
      console.log("Vault RPC not available, token validated but must be set via secrets:", vaultError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        serverName: serverInfo.Name,
        message: "Token validated successfully. Set POSTMARK_SERVER_TOKEN as a backend secret to activate." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
