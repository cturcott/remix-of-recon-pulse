import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a platform_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "platform_admin",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Platform admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "reset_password": {
        // Generate a password reset link via admin API
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: params.email,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ success: true, message: "Password reset link generated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { user_id } = params;
        // Verify user is deactivated
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("status")
          .eq("user_id", user_id)
          .single();

        if (!profile || profile.status !== "inactive") {
          return new Response(
            JSON.stringify({ error: "User must be deactivated before deletion" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete from auth (cascades to profiles, roles, assignments)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_user": {
        const { email, password, first_name, last_name, title, phone, role } = params;
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name, last_name },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile with extra fields
        if (title || phone) {
          await supabaseAdmin
            .from("profiles")
            .update({ title: title || null, phone: phone || null })
            .eq("user_id", userData.user.id);
        }

        // Assign role
        if (role) {
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userData.user.id, role });
        }

        return new Response(
          JSON.stringify({ success: true, user_id: userData.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_user_email": {
        const { user_id, email } = params;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
