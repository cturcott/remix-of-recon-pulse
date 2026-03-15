import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Save, Upload, Loader2, Server, FileSpreadsheet, ArrowRight,
  Eye, Play, Settings2, Trash2, Plus, AlertTriangle, CheckCircle2, XCircle,
  FileUp, Columns, Table2, Pencil, RotateCcw
} from "lucide-react";
import { Link } from "react-router-dom";

const RECON_FIELDS = [
  { value: "vin", label: "VIN", required: true },
  { value: "mileage", label: "Mileage", required: true },
  { value: "stock_number", label: "Stock Number" },
  { value: "year", label: "Year" },
  { value: "make", label: "Make" },
  { value: "model", label: "Model" },
  { value: "trim", label: "Trim" },
  { value: "exterior_color", label: "Exterior Color" },
  { value: "interior_color", label: "Interior Color" },
  { value: "body_style", label: "Body Style" },
  { value: "engine", label: "Engine" },
  { value: "drivetrain", label: "Drivetrain" },
  { value: "fuel_type", label: "Fuel Type" },
  { value: "acv", label: "ACV / Acquired Cost" },
  { value: "acquisition_source", label: "Acquisition Source" },
  { value: "lot_location", label: "Lot Location" },
  { value: "notes", label: "Notes" },
];

const TRANSFORMS = [
  { value: "none", label: "None" },
  { value: "trim", label: "Trim whitespace" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "numeric_only", label: "Numeric only" },
];

function colLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

interface MappingRule {
  source_column: string;
  target_field: string;
  default_value: string;
  transform: string;
}

function parseCsvLine(line: string, del: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === del && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function autoMapFields(headers: string[], existingRules?: MappingRule[]): MappingRule[] {
  return RECON_FIELDS.map(field => {
    // Preserve existing mapping if provided
    const existing = existingRules?.find(r => r.target_field === field.value);
    if (existing && existing.source_column && headers.includes(existing.source_column)) {
      return existing;
    }

    let bestMatch = "";
    for (const h of headers) {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (
        field.value === lower || lower.includes(field.value) ||
        (field.value === "vin" && lower.includes("vin")) ||
        (field.value === "stock_number" && (lower.includes("stock") || lower.includes("stk"))) ||
        (field.value === "mileage" && (lower.includes("mile") || lower.includes("odometer"))) ||
        (field.value === "year" && lower.includes("year")) ||
        (field.value === "make" && (lower === "make" || lower === "brand")) ||
        (field.value === "model" && lower.includes("model")) ||
        (field.value === "trim" && lower === "trim") ||
        (field.value === "exterior_color" && lower.includes("ext") && lower.includes("color")) ||
        (field.value === "interior_color" && lower.includes("int") && lower.includes("color")) ||
        (field.value === "body_style" && lower.includes("body")) ||
        (field.value === "engine" && lower.includes("engine")) ||
        (field.value === "drivetrain" && lower.includes("drive")) ||
        (field.value === "fuel_type" && lower.includes("fuel")) ||
        (field.value === "acv" && (lower.includes("acv") || lower.includes("cost") || lower.includes("price"))) ||
        (field.value === "acquisition_source" && lower.includes("source")) ||
        (field.value === "lot_location" && lower.includes("lot")) ||
        (field.value === "notes" && lower.includes("note"))
      ) {
        bestMatch = h;
        break;
      }
    }
    return {
      source_column: bestMatch,
      target_field: field.value,
      default_value: existing?.default_value || "",
      transform: existing?.transform || (field.value === "vin" ? "uppercase" : "trim"),
    };
  });
}

export default function ImportSettings() {
  const { currentDealership } = useDealership();
  const { isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const remapBatchId = searchParams.get("remap_batch");

  // Config query
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["import-config", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return null;
      const { data, error } = await supabase
        .from("dealership_import_configs")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  // Mapping query
  const { data: activeMapping } = useQuery({
    queryKey: ["import-mapping", config?.id],
    queryFn: async () => {
      if (!config) return null;
      const { data, error } = await supabase
        .from("dealership_import_mappings")
        .select("*")
        .eq("import_config_id", config.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!config,
  });

  // All mapping versions for history
  const { data: allMappings } = useQuery({
    queryKey: ["import-mappings-all", config?.id],
    queryFn: async () => {
      if (!config) return [];
      const { data, error } = await supabase
        .from("dealership_import_mappings")
        .select("*")
        .eq("import_config_id", config.id)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!config,
  });

  // Stages for default stage picker
  const { data: stages } = useQuery({
    queryKey: ["workflow-stages", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data } = await supabase
        .from("workflow_stages")
        .select("id, name, is_start_stage, sort_order")
        .eq("dealership_id", currentDealership.id)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!currentDealership,
  });

  // Config form state
  const [enabled, setEnabled] = useState(false);
  const [ftpHost, setFtpHost] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpUser, setFtpUser] = useState("");
  const [ftpPass, setFtpPass] = useState("");
  const [remotePath, setRemotePath] = useState("/");
  const [filePattern, setFilePattern] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [encoding, setEncoding] = useState("utf-8");
  const [hasHeader, setHasHeader] = useState(true);
  const [frequency, setFrequency] = useState("manual");
  const [postProcess, setPostProcess] = useState("archive");
  const [defaultStageId, setDefaultStageId] = useState<string>("");
  const [dupMode, setDupMode] = useState("skip");
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Mapping state
  const [mappingRules, setMappingRules] = useState<MappingRule[]>([]);
  const [sampleHeaders, setSampleHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [sampleFile, setSampleFile] = useState<string>("");
  const [savingMapping, setSavingMapping] = useState(false);
  const [editingMapping, setEditingMapping] = useState(false);

  // Manual upload state
  const [manualUploadFile, setManualUploadFile] = useState<File | null>(null);
  const [manualUploadContent, setManualUploadContent] = useState<string>("");
  const [manualImporting, setManualImporting] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Parse CSV content into headers and rows
  const parseCsvContent = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const del = delimiter || ",";

    if (lines.length > 0) {
      const headers = parseCsvLine(lines[0], del).map(h => h.replace(/^["']|["']$/g, "").trim());
      setSampleHeaders(headers);
      const dataRows = lines.slice(1, 6).map(line => parseCsvLine(line, del));
      setSampleRows(dataRows);
      return headers;
    }
    return [];
  };

  // Handle manual file select — also parses as sample for mapping
  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setManualUploadContent(text);
      setSampleFile(text);

      // Parse headers for mapping
      const headers = parseCsvContent(text);

      // Auto-map if no existing mapping or editing
      if (headers.length > 0) {
        const existingRules = activeMapping?.mapping_json as unknown as MappingRule[] | undefined;
        const mapped = autoMapFields(headers, existingRules);
        setMappingRules(mapped);
        setEditingMapping(true);

        if (activeMapping) {
          toast.success(`Detected ${headers.length} columns. Existing mapping applied — review and adjust below.`);
        } else {
          toast.success(`Detected ${headers.length} columns. Map your fields below, then import.`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle sample-only upload (for mapping without importing)
  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSampleFile(text);
      const headers = parseCsvContent(text);

      if (headers.length > 0) {
        const existingRules = (activeMapping?.mapping_json as unknown as MappingRule[]) || (mappingRules.length > 0 ? mappingRules : undefined);
        const mapped = autoMapFields(headers, existingRules);
        setMappingRules(mapped);
        toast.success(`Detected ${headers.length} columns. Review the mapping below.`);
      }
    };
    reader.readAsText(file);
  };

  // Save mapping and optionally import
  const handleSaveMapping = async (configOverride?: typeof config) => {
    const configToUse = configOverride || config;
    if (!configToUse || !currentDealership) return;

    const mappedTargets = mappingRules.filter(r => r.source_column).map(r => r.target_field);
    const missingRequired = RECON_FIELDS.filter(f => f.required && !mappedTargets.includes(f.value));
    if (missingRequired.length > 0) {
      toast.error(`Required fields not mapped: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    setSavingMapping(true);
    try {
      // Deactivate old mappings
      await supabase.from("dealership_import_mappings")
        .update({ is_active: false })
        .eq("import_config_id", configToUse.id);

      const { data: newMapping, error } = await supabase.from("dealership_import_mappings").insert([{
        dealership_id: currentDealership.id,
        import_config_id: configToUse.id,
        version_number: (activeMapping?.version_number || 0) + 1,
        is_active: true,
        mapping_json: mappingRules as unknown as import("@/integrations/supabase/types").Json,
      }]).select().single();
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["import-mapping"] });
      queryClient.invalidateQueries({ queryKey: ["import-mappings-all"] });
      setEditingMapping(false);
      toast.success("Column mapping saved");
      return newMapping;
    } catch (err: any) {
      toast.error(err.message || "Failed to save mapping");
      return null;
    } finally {
      setSavingMapping(false);
    }
  };

  // Save mapping then import in one flow
  const handleSaveAndImport = async () => {
    if (!manualUploadContent || !currentDealership) {
      toast.error("Select a CSV file first");
      return;
    }

    // Auto-create config if it doesn't exist yet
    let configToUse = config;
    if (!configToUse) {
      try {
        const { data: newConfig, error } = await supabase
          .from("dealership_import_configs")
          .insert({
            dealership_id: currentDealership.id,
            is_enabled: false,
            delimiter,
            encoding,
            has_header_row: hasHeader,
          })
          .select()
          .single();
        if (error) throw error;
        configToUse = newConfig;
        queryClient.invalidateQueries({ queryKey: ["import-config"] });
      } catch (err: any) {
        toast.error(err.message || "Failed to create import configuration");
        return;
      }
    }

    // Save mapping first if editing
    let mappingToUse = activeMapping;
    if (editingMapping || !activeMapping) {
      const saved = await handleSaveMapping(configToUse);
      if (!saved) return;
      mappingToUse = saved;
    }

    if (!mappingToUse) {
      toast.error("No mapping available");
      return;
    }

    setManualImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("process-csv-import", {
        body: {
          dealership_id: currentDealership.id,
          csv_content: manualUploadContent,
          file_name: manualUploadFile?.name || "manual-upload.csv",
          mapping_id: mappingToUse.id,
          config_id: configToUse.id,
          preview_only: false,
        },
      });
      if (error) throw error;
      setImportResult(data);
      setManualUploadFile(null);
      setManualUploadContent("");
      if (importFileRef.current) importFileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(`Import complete: ${data.success_rows} vehicles created`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setManualImporting(false);
    }
  };

  // Import using existing mapping (no re-mapping needed)
  const handleManualImport = async () => {
    if (!manualUploadContent || !config || !activeMapping || !currentDealership) {
      toast.error("Select a CSV file and ensure mapping is configured");
      return;
    }
    setManualImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("process-csv-import", {
        body: {
          dealership_id: currentDealership.id,
          csv_content: manualUploadContent,
          file_name: manualUploadFile?.name || "manual-upload.csv",
          mapping_id: activeMapping.id,
          config_id: config.id,
          preview_only: false,
        },
      });
      if (error) throw error;
      setImportResult(data);
      setManualUploadFile(null);
      setManualUploadContent("");
      if (importFileRef.current) importFileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(`Import complete: ${data.success_rows} vehicles created`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setManualImporting(false);
    }
  };

  // Edit existing mapping
  const handleEditMapping = () => {
    if (activeMapping?.mapping_json) {
      setMappingRules(activeMapping.mapping_json as unknown as MappingRule[]);
    }
    setEditingMapping(true);
    toast.info("Mapping editor opened. Upload a sample CSV or adjust fields below.");
  };

  // Load a previous mapping version
  const handleLoadMappingVersion = (mapping: any) => {
    setMappingRules(mapping.mapping_json as unknown as MappingRule[]);
    setEditingMapping(true);
    toast.info(`Loaded mapping v${mapping.version_number}. Make changes and save.`);
  };

  const columnOptions = useMemo(() => {
    return sampleHeaders.map((h, i) => ({
      value: h,
      label: `Col ${colLetter(i)} — "${h}"`,
      letter: colLetter(i),
      sampleValues: sampleRows.slice(0, 3).map(row => row[i] || "").filter(Boolean),
    }));
  }, [sampleHeaders, sampleRows]);

  useEffect(() => {
    if (config) {
      setEnabled(config.is_enabled);
      setFtpHost(config.ftp_host ?? "");
      setFtpPort(String(config.ftp_port ?? 21));
      setFtpUser(config.ftp_username ?? "");
      setRemotePath(config.remote_path ?? "/");
      setFilePattern(config.file_name_pattern ?? "");
      setDelimiter(config.delimiter ?? ",");
      setEncoding(config.encoding ?? "utf-8");
      setHasHeader(config.has_header_row ?? true);
      setFrequency(config.import_frequency ?? "manual");
      setPostProcess(config.post_process_action ?? "archive");
      setDefaultStageId(config.default_starting_stage_id ?? "");
      setDupMode(config.duplicate_handling_mode ?? "skip");
      setReviewEnabled(config.review_queue_enabled ?? false);
    }
  }, [config]);

  useEffect(() => {
    if (activeMapping?.mapping_json && !editingMapping) {
      setMappingRules(activeMapping.mapping_json as unknown as MappingRule[]);
    }
  }, [activeMapping]);

  // If arriving from re-map flow, open mapping editor
  useEffect(() => {
    if (remapBatchId && activeMapping) {
      setEditingMapping(true);
      toast.info("Adjust your column mapping below, then re-import your file.");
    }
  }, [remapBatchId, activeMapping]);

  const updateMappingRule = (index: number, field: keyof MappingRule, value: string) => {
    setMappingRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handlePreview = async () => {
    if (!sampleFile || !config || !activeMapping) {
      toast.error("Save your mapping and upload a CSV first");
      return;
    }
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("process-csv-import", {
        body: {
          dealership_id: currentDealership!.id,
          csv_content: sampleFile,
          file_name: "preview.csv",
          mapping_id: activeMapping.id,
          config_id: config.id,
          preview_only: true,
        },
      });
      if (error) throw error;
      setPreviewResult(data);
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleRunImport = async () => {
    if (!sampleFile || !config || !activeMapping) {
      toast.error("Upload a CSV and ensure mapping is configured");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("process-csv-import", {
        body: {
          dealership_id: currentDealership!.id,
          csv_content: sampleFile,
          file_name: fileInputRef.current?.files?.[0]?.name || "import.csv",
          mapping_id: activeMapping.id,
          config_id: config.id,
          preview_only: false,
        },
      });
      if (error) throw error;
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(`Import complete: ${data.success_rows} vehicles created`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!currentDealership) return;
    setSavingConfig(true);
    try {
      const payload = {
        dealership_id: currentDealership.id,
        is_enabled: enabled,
        ftp_host: ftpHost || null,
        ftp_port: parseInt(ftpPort) || 21,
        ftp_username: ftpUser || null,
        ftp_password_ref: ftpPass ? "configured" : config?.ftp_password_ref || null,
        remote_path: remotePath || "/",
        file_name_pattern: filePattern || null,
        delimiter,
        encoding,
        has_header_row: hasHeader,
        import_frequency: frequency,
        post_process_action: postProcess,
        default_starting_stage_id: defaultStageId || null,
        duplicate_handling_mode: dupMode,
        review_queue_enabled: reviewEnabled,
      };

      if (config?.id) {
        const { error } = await supabase.from("dealership_import_configs").update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealership_import_configs").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["import-config"] });
      toast.success("Import configuration saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingConfig(false);
    }
  };

  if (!isDealershipAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          You need admin permissions to access import settings.
        </div>
      </AppLayout>
    );
  }

  if (configLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const mappedCount = mappingRules.filter(r => r.source_column).length;
  const hasMapping = !!activeMapping;
  const showMappingEditor = editingMapping || (!hasMapping && sampleHeaders.length > 0);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSV Import Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated vehicle intake from CSV files for {currentDealership?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/import/review">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" /> Review Queue
            </Button>
          </Link>
          <Link to="/import/history">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Import History
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Re-map Banner */}
        {remapBatchId && (
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <RotateCcw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Correct Mapping & Re-import</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust your column mapping below, save the updated mapping, then upload and re-import your CSV file.
              </p>
            </div>
          </div>
        )}

        {/* Mapping Status Banner (first time) */}
        {config && !hasMapping && !remapBatchId && (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Column Mapping Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV file below to auto-detect columns and map them to vehicle fields.
                You can also map columns when uploading for import — just upload your file and map in one step.
              </p>
            </div>
          </div>
        )}

        {/* FTP Configuration */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Import Source (FTP)</h2>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>FTP Host</Label>
              <Input value={ftpHost} onChange={e => setFtpHost(e.target.value)} placeholder="ftp.example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input value={ftpPort} onChange={e => setFtpPort(e.target.value)} placeholder="21" />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={ftpUser} onChange={e => setFtpUser(e.target.value)} placeholder="ftp_user" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={ftpPass} onChange={e => setFtpPass(e.target.value)} placeholder={config?.ftp_password_ref ? "••••••••" : "Enter password"} />
            </div>
            <div className="space-y-1.5">
              <Label>Remote Path</Label>
              <Input value={remotePath} onChange={e => setRemotePath(e.target.value)} placeholder="/inventory/" />
            </div>
            <div className="space-y-1.5">
              <Label>File Pattern</Label>
              <Input value={filePattern} onChange={e => setFilePattern(e.target.value)} placeholder="*.csv" />
            </div>
          </div>

          <Separator className="my-4" />
          <h3 className="text-sm font-semibold text-foreground mb-3">File Format</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Delimiter</Label>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value="	">Tab</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Encoding</Label>
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="latin1">Latin-1</SelectItem>
                  <SelectItem value="ascii">ASCII</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={hasHeader} onCheckedChange={setHasHeader} id="header-switch" />
              <Label htmlFor="header-switch">File has header row</Label>
            </div>
          </div>

          <Separator className="my-4" />
          <h3 className="text-sm font-semibold text-foreground mb-3">Import Behavior</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Import Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>After Processing</Label>
              <Select value={postProcess} onValueChange={setPostProcess}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">Archive file</SelectItem>
                  <SelectItem value="delete">Delete file</SelectItem>
                  <SelectItem value="ignore">Leave in place</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Starting Stage</Label>
              <Select value={defaultStageId} onValueChange={setDefaultStageId}>
                <SelectTrigger><SelectValue placeholder="Auto (first stage)" /></SelectTrigger>
                <SelectContent>
                  {(stages || []).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.is_start_stage ? "(start)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duplicate Handling</Label>
              <Select value={dupMode} onValueChange={setDupMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip duplicates</SelectItem>
                  <SelectItem value="review">Send to review queue</SelectItem>
                  <SelectItem value="fail">Fail duplicate rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Switch checked={reviewEnabled} onCheckedChange={setReviewEnabled} id="review-switch" />
            <Label htmlFor="review-switch">Enable review queue for failed validations</Label>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Configuration
            </Button>
          </div>
        </section>

        {/* Manual CSV Upload — always shown */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Upload CSV Inventory File</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a CSV file to import vehicles. {!hasMapping ? "Column mapping will be auto-detected from your file." : "Your saved mapping will be applied automatically."}
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm font-medium">Select CSV File</Label>
                  <p className="text-xs text-muted-foreground">
                    {hasMapping
                      ? `Using mapping v${activeMapping?.version_number} · Delimiter: "${config?.delimiter || ","}" · ${config?.has_header_row ? "Header row" : "No header"}`
                      : "Columns will be auto-detected after upload"
                    }
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleManualFileSelect}
                  ref={importFileRef}
                  className="max-w-64"
                />
              </div>
            </div>

            {manualUploadFile && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{manualUploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(manualUploadFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex gap-2">
                  {hasMapping && !editingMapping ? (
                    <Button onClick={handleManualImport} disabled={manualImporting} size="sm">
                      {manualImporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      Import Now
                    </Button>
                  ) : (
                    <Button onClick={handleSaveAndImport} disabled={manualImporting || savingMapping} size="sm">
                      {manualImporting || savingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      {editingMapping ? "Save Mapping & Import" : "Map & Import"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Column Mapping */}
        {config && (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Columns className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">CSV Column Mapping</h2>
              <div className="ml-auto flex items-center gap-2">
                {activeMapping && <Badge variant="outline">v{activeMapping.version_number}</Badge>}
                {hasMapping ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">{mappedCount} fields mapped</Badge>
                ) : (
                  <Badge variant="destructive">Not configured</Badge>
                )}
                {hasMapping && !editingMapping && (
                  <Button variant="outline" size="sm" onClick={handleEditMapping}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Mapping
                  </Button>
                )}
                {editingMapping && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingMapping(false);
                    if (activeMapping?.mapping_json) {
                      setMappingRules(activeMapping.mapping_json as unknown as MappingRule[]);
                    }
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {!editingMapping && hasMapping ? (
              /* Read-only mapping summary */
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Current mapping (v{activeMapping?.version_number}). Click "Edit Mapping" to modify, or upload a new CSV above to re-map.
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Vehicle Field</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">CSV Column</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Transform</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingRules.filter(r => r.source_column).map((rule, i) => {
                        const fieldDef = RECON_FIELDS.find(f => f.value === rule.target_field);
                        const transformLabel = TRANSFORMS.find(t => t.value === rule.transform)?.label || "None";
                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-4 py-2 text-xs font-medium text-foreground">
                              {fieldDef?.label || rule.target_field}
                              {fieldDef?.required && <span className="text-destructive ml-0.5">*</span>}
                            </td>
                            <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{rule.source_column}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{transformLabel}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{rule.default_value || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mapping Version History */}
                {allMappings && allMappings.length > 1 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Previous Versions</h4>
                    <div className="flex flex-wrap gap-2">
                      {allMappings.filter(m => !m.is_active).slice(0, 5).map(m => (
                        <Button
                          key={m.id}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleLoadMappingVersion(m)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> v{m.version_number}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Editable mapping */
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Map each CSV column to its corresponding vehicle intake field. Upload a sample file to auto-detect columns.
                </p>

                {/* Upload Sample (only show if no headers detected yet) */}
                {sampleHeaders.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 mb-5">
                    <div className="flex items-center gap-3">
                      <FileUp className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Upload Sample CSV</Label>
                        <p className="text-xs text-muted-foreground">Upload a CSV file to detect column headers and preview sample data</p>
                      </div>
                      <Input type="file" accept=".csv,.txt" onChange={handleSampleUpload} ref={fileInputRef} className="max-w-64" />
                    </div>
                  </div>
                )}

                {/* CSV Column Preview Table */}
                {sampleHeaders.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Detected Columns</h3>
                      <span className="text-xs text-muted-foreground">({sampleHeaders.length} columns found)</span>
                      <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => {
                        setSampleHeaders([]);
                        setSampleRows([]);
                        setSampleFile("");
                      }}>
                        Upload Different File
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border overflow-auto max-h-48">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Col</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Header Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sample Values</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleHeaders.map((h, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-1.5">
                                <Badge variant="outline" className="font-mono text-xs">{colLetter(i)}</Badge>
                              </td>
                              <td className="px-3 py-1.5 font-medium text-foreground text-xs">{h}</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono truncate max-w-64">
                                {sampleRows.slice(0, 3).map(row => row[i] || "").filter(Boolean).join(" · ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {/* Mapping Table */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Field Assignments</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    For each vehicle field, select which CSV column provides the data. Fields marked with * are required.
                  </p>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-44">Vehicle Field</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">CSV Column</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-36">Transform</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-32">Default Value</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-40">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappingRules.map((rule, i) => {
                          const fieldDef = RECON_FIELDS.find(f => f.value === rule.target_field);
                          const colIdx = sampleHeaders.indexOf(rule.source_column);
                          const previewValues = colIdx >= 0
                            ? sampleRows.slice(0, 2).map(row => row[colIdx] || "").filter(Boolean)
                            : [];

                          return (
                            <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2">
                                <span className="font-medium text-foreground text-xs">
                                  {fieldDef?.label || rule.target_field}
                                  {fieldDef?.required && <span className="text-destructive ml-0.5">*</span>}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {sampleHeaders.length > 0 ? (
                                  <Select value={rule.source_column} onValueChange={v => updateMappingRule(i, "source_column", v === "__none__" ? "" : v)}>
                                    <SelectTrigger className="text-xs h-8">
                                      <SelectValue placeholder="— Not mapped —" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">— Not mapped —</SelectItem>
                                      {columnOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <span className="font-mono text-muted-foreground mr-1.5">{opt.letter}</span>
                                          {opt.value}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={rule.source_column}
                                    onChange={e => updateMappingRule(i, "source_column", e.target.value)}
                                    placeholder="Column name"
                                    className="text-xs h-8"
                                  />
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <Select value={rule.transform} onValueChange={v => updateMappingRule(i, "transform", v)}>
                                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {TRANSFORMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  value={rule.default_value}
                                  onChange={e => updateMappingRule(i, "default_value", e.target.value)}
                                  placeholder="—"
                                  className="text-xs h-8"
                                />
                              </td>
                              <td className="px-4 py-2">
                                {previewValues.length > 0 ? (
                                  <span className="text-xs text-muted-foreground font-mono truncate block max-w-36" title={previewValues.join(", ")}>
                                    {previewValues[0]}
                                  </span>
                                ) : rule.source_column ? (
                                  <span className="text-xs text-muted-foreground italic">No sample data</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between mt-5">
                  <div className="text-xs text-muted-foreground">
                    {mappedCount} of {mappingRules.length} fields mapped
                    {mappingRules.filter(r => !r.source_column && RECON_FIELDS.find(f => f.value === r.target_field)?.required).length > 0 && (
                      <span className="text-destructive ml-2">
                        <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                        Required fields unmapped
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePreview} disabled={previewing || !sampleFile || !activeMapping}>
                      {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      Preview Import
                    </Button>
                    <Button onClick={() => handleSaveMapping()} disabled={savingMapping}>
                      {savingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Mapping
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Preview Results */}
        {previewResult && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Import Preview</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{previewResult.total_rows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{previewResult.valid_count}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{previewResult.invalid_count}</p>
                <p className="text-xs text-muted-foreground">Invalid</p>
              </div>
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">VIN</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Stock #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Year/Make/Model</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.preview_rows?.map((row: any) => (
                    <tr key={row.row_number} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.mapped?.vin || "—"}</td>
                      <td className="px-3 py-2">{row.mapped?.stock_number || "—"}</td>
                      <td className="px-3 py-2">{[row.mapped?.year, row.mapped?.make, row.mapped?.model].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2 text-destructive text-xs">{row.errors?.join("; ") || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleRunImport} disabled={importing || previewResult.valid_count === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Run Import ({previewResult.valid_count} vehicles)
              </Button>
            </div>
          </section>
        )}

        {/* Import Result */}
        {importResult && (
          <section className={`rounded-xl border p-6 ${importResult.status === "completed" ? "border-primary/30 bg-primary/5" : "border-accent/30 bg-accent/5"}`}>
            <h2 className="text-lg font-semibold text-foreground mb-3">Import Complete</h2>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{importResult.total_rows}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{importResult.success_rows}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-destructive">{importResult.failed_rows}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-muted-foreground">{importResult.skipped_rows}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Link to={`/import/batch/${importResult.batch_id}`}>
                <Button variant="outline" size="sm">View Batch Detail</Button>
              </Link>
              {importResult.warning_rows > 0 && (
                <Link to="/import/review">
                  <Button variant="outline" size="sm">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Review Queue ({importResult.warning_rows})
                  </Button>
                </Link>
              )}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
