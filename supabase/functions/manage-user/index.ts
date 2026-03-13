import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://reconpulse.lovable.app";

async function getPostmarkConfig(supabase: any) {
  const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!postmarkToken) return null;

  const { data: settings } = await supabase
    .from("email_provider_settings")
    .select("*")
    .eq("provider_name", "postmark")
    .maybeSingle();

  if (!settings?.integration_enabled) return null;

  return {
    token: postmarkToken,
    fromEmail: settings.from_email || "noreply@example.com",
    fromName: settings.from_name || "Recon Pulse",
    messageStream: settings.message_stream || "outbound",
  };
}

async function sendPostmarkEmail(config: { token: string; fromEmail: string; fromName: string; messageStream: string }, options: { to: string; subject: string; htmlBody: string; tag: string }) {
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": config.token,
      },
      body: JSON.stringify({
        From: `${config.fromName} <${config.fromEmail}>`,
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.htmlBody,
        MessageStream: config.messageStream,
        Tag: options.tag,
      }),
    });
    const data = await res.json();
    console.log(`Email sent (${options.tag}):`, res.ok ? data.MessageID : data.Message);
    return res.ok;
  } catch (err) {
    console.error(`Failed to send email (${options.tag}):`, err.message);
    return false;
  }
}

function buildWelcomeEmail(params: { firstName: string; email: string; password: string; createdByName: string; loginUrl: string }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0d9488; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">👋 Welcome to Recon Pulse</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
          Hi ${params.firstName},
        </p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
          Your Recon Pulse account has been created by <strong>${params.createdByName}</strong>. Here are your login credentials:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f9fafb; border-radius: 6px;">
          <tr>
            <td style="padding: 12px 16px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Username (Email)</td>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${params.email}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Temporary Password</td>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; font-family: monospace; letter-spacing: 1px;">${params.password}</td>
          </tr>
        </table>
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            ⚠️ <strong>Important:</strong> Please change your password after your first login.
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.loginUrl}"
             style="display: inline-block; background: #0d9488; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Log In to Recon Pulse
          </a>
        </div>
        <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
          If you have any questions, contact your administrator.
        </p>
      </div>
    </div>
  `;
}

function buildPasswordChangedEmail(params: { firstName: string; changedByName: string; changedAt: string }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">🔒 Password Changed</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
          Hi ${params.firstName},
        </p>
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
          Your Recon Pulse password was changed on <strong>${params.changedAt}</strong> by <strong>${params.changedByName}</strong>.
        </p>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            🚨 <strong>If you did not initiate this change</strong>, please contact your administrator or support immediately to secure your account.
          </p>
        </div>
        <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This is an automated security notification from Recon Pulse.
        </p>
      </div>
    </div>
  `;
}

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

    // Get caller's name for email attribution
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", caller.id)
      .single();
    const callerName = callerProfile
      ? `${callerProfile.first_name} ${callerProfile.last_name}`.trim()
      : "An administrator";

    const { action, ...params } = await req.json();

    switch (action) {
      case "reset_password": {
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

        // Send password changed notification
        const postmarkConfig = await getPostmarkConfig(supabaseAdmin);
        if (postmarkConfig) {
          const { data: targetProfile } = await supabaseAdmin
            .from("profiles")
            .select("first_name")
            .eq("email", params.email)
            .single();

          await sendPostmarkEmail(postmarkConfig, {
            to: params.email,
            subject: "🔒 Recon Pulse – Your Password Has Been Reset",
            htmlBody: buildPasswordChangedEmail({
              firstName: targetProfile?.first_name || "Team Member",
              changedByName: callerName,
              changedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
            }),
            tag: "password-changed",
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Password reset link generated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { user_id } = params;
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

        // Send welcome email with credentials
        const postmarkConfig = await getPostmarkConfig(supabaseAdmin);
        if (postmarkConfig) {
          await sendPostmarkEmail(postmarkConfig, {
            to: email,
            subject: "👋 Welcome to Recon Pulse – Your Account Is Ready",
            htmlBody: buildWelcomeEmail({
              firstName: first_name || "Team Member",
              email,
              password,
              createdByName: callerName,
              loginUrl: `${APP_URL}/auth`,
            }),
            tag: "welcome",
          });
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

      case "change_password": {
        const { user_id, new_password } = params;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send password changed notification to the user
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, email")
          .eq("user_id", user_id)
          .single();

        if (targetProfile) {
          const postmarkConfig = await getPostmarkConfig(supabaseAdmin);
          if (postmarkConfig) {
            await sendPostmarkEmail(postmarkConfig, {
              to: targetProfile.email,
              subject: "🔒 Recon Pulse – Your Password Has Been Changed",
              htmlBody: buildPasswordChangedEmail({
                firstName: targetProfile.first_name || "Team Member",
                changedByName: callerName,
                changedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
              }),
              tag: "password-changed",
            });
          }
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
