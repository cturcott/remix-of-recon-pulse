import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MappingRule {
  source_column: string;
  target_field: string;
  default_value?: string;
  transform?: string;
}

function parseCSV(text: string, delimiter: string, hasHeader: boolean): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  let headers: string[];
  let dataLines: string[];

  if (hasHeader) {
    headers = parseLine(lines[0]);
    dataLines = lines.slice(1);
  } else {
    const colCount = parseLine(lines[0]).length;
    headers = Array.from({ length: colCount }, (_, i) => `column_${i + 1}`);
    dataLines = lines;
  }

  const rows = dataLines.map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function applyTransform(value: string, transform?: string): string {
  if (!transform || !value) return value;
  switch (transform) {
    case "trim": return value.trim();
    case "uppercase": return value.toUpperCase();
    case "lowercase": return value.toLowerCase();
    case "numeric_only": return value.replace(/[^0-9.]/g, "");
    default: return value;
  }
}

function mapRow(rawRow: Record<string, string>, mappings: MappingRule[]): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const rule of mappings) {
    let value = rawRow[rule.source_column] ?? "";
    value = applyTransform(value, rule.transform);
    if (!value && rule.default_value) value = rule.default_value;
    if (value) {
      // Type coerce for known numeric fields
      if (["year", "mileage", "acv"].includes(rule.target_field)) {
        const num = parseFloat(value.replace(/[^0-9.]/g, ""));
        mapped[rule.target_field] = isNaN(num) ? null : (rule.target_field === "year" || rule.target_field === "mileage" ? Math.round(num) : num);
      } else {
        mapped[rule.target_field] = value;
      }
    }
  }
  return mapped;
}

function validateRow(mapped: Record<string, any>): string[] {
  const errors: string[] = [];
  if (!mapped.vin) errors.push("VIN is required");
  else if (typeof mapped.vin === "string" && mapped.vin.length !== 17) errors.push("VIN must be 17 characters");
  if (mapped.mileage === undefined || mapped.mileage === null) errors.push("Mileage is required");
  else if (typeof mapped.mileage === "number" && mapped.mileage < 0) errors.push("Mileage cannot be negative");
  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { dealership_id, csv_content, file_name, mapping_id, config_id, preview_only } = await req.json();

    if (!dealership_id || !csv_content) {
      return new Response(JSON.stringify({ error: "dealership_id and csv_content required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorization: must be platform_admin or dealership_admin assigned to this dealership
    const { data: isPlatformAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "platform_admin" });
    const { data: isDealershipAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "dealership_admin" });
    const { data: isAssigned } = await supabase.rpc("is_assigned_to_dealership", { _user_id: user.id, _dealership_id: dealership_id });

    if (!isPlatformAdmin && !(isDealershipAdmin && isAssigned)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get import config
    const { data: config } = await supabase
      .from("dealership_import_configs")
      .select("*")
      .eq("id", config_id)
      .eq("dealership_id", dealership_id)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "Import config not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get mapping
    let mappings: MappingRule[] = [];
    if (mapping_id) {
      const { data: mapping } = await supabase
        .from("dealership_import_mappings")
        .select("*")
        .eq("id", mapping_id)
        .eq("dealership_id", dealership_id)
        .single();
      if (mapping) {
        mappings = (mapping.mapping_json as MappingRule[]) || [];
      }
    }

    if (mappings.length === 0) {
      return new Response(JSON.stringify({ error: "No field mapping configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse CSV
    const { headers, rows } = parseCSV(csv_content, config.delimiter || ",", config.has_header_row ?? true);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "CSV file is empty or has no data rows" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get default starting stage
    let defaultStageId = config.default_starting_stage_id;
    if (!defaultStageId) {
      const { data: startStage } = await supabase
        .from("workflow_stages")
        .select("id")
        .eq("dealership_id", dealership_id)
        .eq("is_start_stage", true)
        .eq("is_active", true)
        .single();
      defaultStageId = startStage?.id || null;
    }

    // Preview mode: just return mapped/validated data without creating anything
    if (preview_only) {
      const previewRows = rows.slice(0, 50).map((raw, i) => {
        const mapped = mapRow(raw, mappings);
        const errors = validateRow(mapped);
        return { row_number: i + 1, raw, mapped, errors, valid: errors.length === 0 };
      });
      return new Response(JSON.stringify({
        preview: true,
        headers,
        total_rows: rows.length,
        preview_rows: previewRows,
        valid_count: previewRows.filter(r => r.valid).length,
        invalid_count: previewRows.filter(r => !r.valid).length,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        dealership_id,
        import_config_id: config_id,
        mapping_id,
        batch_status: "processing",
        source_file_name: file_name || "manual_upload.csv",
        started_at: new Date().toISOString(),
        total_rows: rows.length,
        triggered_by: user.id,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let warningCount = 0;

    // Get existing VINs and stock numbers for duplicate detection
    const { data: existingVehicles } = await supabase
      .from("vehicles")
      .select("vin, stock_number")
      .eq("dealership_id", dealership_id);

    const existingVins = new Set((existingVehicles || []).map(v => v.vin?.toUpperCase()));
    const existingStocks = new Set((existingVehicles || []).filter(v => v.stock_number).map(v => v.stock_number!.toUpperCase()));

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const mapped = mapRow(raw, mappings);
      const errors = validateRow(mapped);

      let dupStatus = "none";
      let vinDecodeStatus = "pending";
      let finalOutcome = "pending";
      let createdVehicleId: string | null = null;

      // Duplicate check
      const vin = (mapped.vin as string)?.toUpperCase();
      const stock = (mapped.stock_number as string)?.toUpperCase();

      if (vin && existingVins.has(vin)) {
        dupStatus = "duplicate_vin";
        if (config.duplicate_handling_mode === "skip") {
          finalOutcome = "skipped";
          skippedCount++;
        } else if (config.duplicate_handling_mode === "review") {
          finalOutcome = "needs_review";
          warningCount++;
        } else if (config.duplicate_handling_mode === "fail") {
          errors.push("Duplicate VIN found in dealership inventory");
          finalOutcome = "failed";
          failedCount++;
        }
      } else if (stock && existingStocks.has(stock)) {
        dupStatus = "duplicate_stock";
        if (config.duplicate_handling_mode === "skip") {
          finalOutcome = "skipped";
          skippedCount++;
        } else if (config.duplicate_handling_mode === "review") {
          finalOutcome = "needs_review";
          warningCount++;
        } else if (config.duplicate_handling_mode === "fail") {
          errors.push("Duplicate stock number found");
          finalOutcome = "failed";
          failedCount++;
        }
      }

      // If validation errors exist
      if (errors.length > 0 && finalOutcome === "pending") {
        if (config.review_queue_enabled) {
          finalOutcome = "needs_review";
          warningCount++;
        } else {
          finalOutcome = "failed";
          failedCount++;
        }
      }

      // If no issues, try VIN decode and create vehicle
      if (finalOutcome === "pending" && errors.length === 0) {
        // VIN decode
        if (vin && vin.length === 17) {
          try {
            const vinRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
            const vinData = await vinRes.json();
            if (vinData.Results?.[0]) {
              const r = vinData.Results[0];
              const isSuccess = r.ErrorCode === "0" || r.ErrorCode?.split(",").includes("0");
              if (isSuccess) {
                vinDecodeStatus = "success";
                if (!mapped.year && r.ModelYear) mapped.year = parseInt(r.ModelYear) || null;
                if (!mapped.make && r.Make) mapped.make = r.Make;
                if (!mapped.model && r.Model) mapped.model = r.Model;
                if (!mapped.trim && r.Trim) mapped.trim = r.Trim;
                if (!mapped.body_style && r.BodyClass) mapped.body_style = r.BodyClass;
                if (!mapped.drivetrain && r.DriveType) mapped.drivetrain = r.DriveType;
                if (!mapped.fuel_type && r.FuelTypePrimary) mapped.fuel_type = r.FuelTypePrimary;
                if (!mapped.engine) {
                  const eng = [r.EngineConfiguration, r.DisplacementL ? `${r.DisplacementL}L` : null, r.EngineCylinders ? `${r.EngineCylinders}cyl` : null].filter(Boolean).join(" ");
                  if (eng) mapped.engine = eng;
                }
              } else {
                vinDecodeStatus = "partial";
              }
            }
          } catch {
            vinDecodeStatus = "failed";
          }
        }

        // Create vehicle
        try {
          const vehicleData: Record<string, any> = {
            dealership_id,
            vin: mapped.vin,
            mileage: mapped.mileage || 0,
            year: mapped.year || null,
            make: mapped.make || null,
            model: mapped.model || null,
            trim: mapped.trim || null,
            stock_number: mapped.stock_number || null,
            exterior_color: mapped.exterior_color || null,
            interior_color: mapped.interior_color || null,
            body_style: mapped.body_style || null,
            engine: mapped.engine || null,
            drivetrain: mapped.drivetrain || null,
            fuel_type: mapped.fuel_type || null,
            acv: mapped.acv || null,
            acquisition_source: mapped.acquisition_source || null,
            lot_location: mapped.lot_location || null,
            notes: mapped.notes || null,
            current_stage_id: defaultStageId,
            status: "in_recon",
            import_source_type: "csv_upload",
            import_batch_id: batch.id,
            import_created: true,
            created_by: user.id,
          };

          const { data: vehicle, error: vErr } = await supabase
            .from("vehicles")
            .insert(vehicleData)
            .select("id")
            .single();

          if (vErr) throw vErr;
          createdVehicleId = vehicle.id;
          finalOutcome = vinDecodeStatus === "failed" ? "imported_with_warnings" : "success";
          if (finalOutcome === "imported_with_warnings") warningCount++;
          else successCount++;

          // Add to existing sets for in-batch duplicate detection
          if (vin) existingVins.add(vin);
          if (stock) existingStocks.add(stock);

          // Create stage history entry
          if (defaultStageId) {
            await supabase.from("vehicle_stage_history").insert({
              dealership_id,
              vehicle_id: vehicle.id,
              to_stage_id: defaultStageId,
              changed_by: user.id,
              note: "Auto-created by CSV import",
            });
          }
        } catch (createErr: any) {
          errors.push(createErr.message || "Failed to create vehicle");
          finalOutcome = "failed";
          failedCount++;
        }
      }

      // Insert batch row
      await supabase.from("import_batch_rows").insert({
        batch_id: batch.id,
        dealership_id,
        row_number: i + 1,
        raw_row_json: raw,
        mapped_row_json: mapped,
        validation_status: errors.length > 0 ? "failed" : "passed",
        validation_errors_json: errors,
        vin_decode_status: vinDecodeStatus,
        duplicate_status: dupStatus,
        created_vehicle_id: createdVehicleId,
        review_status: finalOutcome === "needs_review" ? "pending" : "none",
        final_outcome: finalOutcome,
      });
    }

    // Update batch
    await supabase.from("import_batches").update({
      batch_status: failedCount === rows.length ? "failed" : (failedCount > 0 || warningCount > 0 ? "completed_with_issues" : "completed"),
      completed_at: new Date().toISOString(),
      success_rows: successCount,
      failed_rows: failedCount,
      skipped_rows: skippedCount,
      warning_rows: warningCount,
    }).eq("id", batch.id);

    return new Response(JSON.stringify({
      batch_id: batch.id,
      total_rows: rows.length,
      success_rows: successCount,
      failed_rows: failedCount,
      skipped_rows: skippedCount,
      warning_rows: warningCount,
      status: failedCount === rows.length ? "failed" : (failedCount > 0 || warningCount > 0 ? "completed_with_issues" : "completed"),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
