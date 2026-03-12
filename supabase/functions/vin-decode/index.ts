import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { vin } = await req.json();

    if (!vin || typeof vin !== "string" || vin.length !== 17) {
      return new Response(
        JSON.stringify({ error: "Invalid VIN. Must be exactly 17 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the free NHTSA VIN decoder API
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unable to decode VIN.", decode_status: "failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data.Results[0];
    const errorCode = result.ErrorCode;

    // ErrorCode "0" means successful decode
    const isSuccess = errorCode === "0" || errorCode?.split(",").includes("0");

    const decoded = {
      year: result.ModelYear ? parseInt(result.ModelYear, 10) || null : null,
      make: result.Make || null,
      model: result.Model || null,
      trim: result.Trim || null,
      body_style: result.BodyClass || null,
      engine: [result.EngineConfiguration, result.DisplacementL ? `${result.DisplacementL}L` : null, result.EngineCylinders ? `${result.EngineCylinders}cyl` : null]
        .filter(Boolean)
        .join(" ") || null,
      drivetrain: result.DriveType || null,
      fuel_type: result.FuelTypePrimary || null,
    };

    return new Response(
      JSON.stringify({
        decode_status: isSuccess ? "success" : "partial",
        decoded,
        raw: result,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, decode_status: "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
