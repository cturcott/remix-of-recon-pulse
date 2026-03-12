import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Eye, Play, Settings2, Trash2, Plus, AlertTriangle, CheckCircle2, XCircle
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
  { value: "", label: "None" },
  { value: "trim", label: "Trim whitespace" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "numeric_only", label: "Numeric only" },
];

interface MappingRule {
  source_column: string;
  target_field: string;
  default_value: string;
  transform: string;
}

export default function ImportSettings() {
  const { currentDealership } = useDealership();
  const { isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [sampleFile, setSampleFile] = useState<string>("");
  const [savingMapping, setSavingMapping] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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
    if (activeMapping?.mapping_json) {
      setMappingRules(activeMapping.mapping_json as unknown as MappingRule[]);
    }
  }, [activeMapping]);

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

  const handleSampleUploadOld = null; // removed

  // Fix the auto-mapping - simpler version
  const handleSampleUploadFixed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSampleFile(text);
      const firstLine = text.split(/\r?\n/)[0];
      if (firstLine) {
        const del = delimiter || ",";
        const headers = firstLine.split(del).map(h => h.replace(/^["']|["']$/g, "").trim());
        setSampleHeaders(headers);
        if (mappingRules.length === 0) {
          const autoMapped: MappingRule[] = headers.map(h => {
            const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "_");
            let targetField = "";
            for (const f of RECON_FIELDS) {
              if (f.value === lower || lower.includes(f.value) ||
                (f.value === "vin" && lower.includes("vin")) ||
                (f.value === "stock_number" && (lower.includes("stock") || lower.includes("stk"))) ||
                (f.value === "mileage" && (lower.includes("mile") || lower.includes("odometer"))) ||
                (f.value === "year" && lower.includes("year")) ||
                (f.value === "make" && (lower === "make" || lower === "brand")) ||
                (f.value === "model" && lower.includes("model")) ||
                (f.value === "exterior_color" && (lower.includes("ext") && lower.includes("color")))
              ) {
                targetField = f.value;
                break;
              }
            }
            return { source_column: h, target_field: targetField, default_value: "", transform: targetField === "vin" ? "uppercase" : "trim" };
          });
          setMappingRules(autoMapped);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveMapping = async () => {
    if (!config || !currentDealership) return;
    setSavingMapping(true);
    try {
      // Deactivate old mappings
      await supabase.from("dealership_import_mappings")
        .update({ is_active: false })
        .eq("import_config_id", config.id);

      const { error } = await supabase.from("dealership_import_mappings").insert([{
        dealership_id: currentDealership.id,
        import_config_id: config.id,
        version_number: (activeMapping?.version_number || 0) + 1,
        is_active: true,
        mapping_json: mappingRules as unknown as import("@/integrations/supabase/types").Json,
      }]);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["import-mapping"] });
      toast.success("Field mapping saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save mapping");
    } finally {
      setSavingMapping(false);
    }
  };

  const addMappingRule = () => {
    setMappingRules(prev => [...prev, { source_column: "", target_field: "", default_value: "", transform: "trim" }]);
  };

  const removeMappingRule = (index: number) => {
    setMappingRules(prev => prev.filter((_, i) => i !== index));
  };

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
          <Link to="/import/history">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Import History
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
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

        {/* Field Mapping */}
        {config && (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Field Mapping</h2>
              {activeMapping && <Badge variant="outline" className="ml-auto">v{activeMapping.version_number}</Badge>}
            </div>

            <div className="mb-4">
              <Label>Upload Sample CSV to Auto-Detect Headers</Label>
              <div className="mt-1.5">
                <Input type="file" accept=".csv,.txt" onChange={handleSampleUploadFixed} ref={fileInputRef} />
              </div>
              {sampleHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Detected {sampleHeaders.length} columns: {sampleHeaders.join(", ")}
                </p>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-3">CSV Column</div>
                <div className="col-span-1 flex items-center justify-center"><ArrowRight className="h-3 w-3" /></div>
                <div className="col-span-3">Recon Pulse Field</div>
                <div className="col-span-2">Transform</div>
                <div className="col-span-2">Default</div>
                <div className="col-span-1"></div>
              </div>

              {mappingRules.map((rule, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    {sampleHeaders.length > 0 ? (
                      <Select value={rule.source_column} onValueChange={v => updateMappingRule(i, "source_column", v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {sampleHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={rule.source_column} onChange={e => updateMappingRule(i, "source_column", e.target.value)} placeholder="Column name" className="text-sm" />
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center text-muted-foreground"><ArrowRight className="h-4 w-4" /></div>
                  <div className="col-span-3">
                    <Select value={rule.target_field} onValueChange={v => updateMappingRule(i, "target_field", v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Target field" /></SelectTrigger>
                      <SelectContent>
                        {RECON_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label} {f.required ? "*" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Select value={rule.transform} onValueChange={v => updateMappingRule(i, "transform", v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRANSFORMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input value={rule.default_value} onChange={e => updateMappingRule(i, "default_value", e.target.value)} placeholder="Default" className="text-sm" />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => removeMappingRule(i)} className="h-8 w-8">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addMappingRule}>
                <Plus className="h-3 w-3 mr-1" /> Add Mapping Rule
              </Button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handlePreview} disabled={previewing || !sampleFile}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Preview Import
              </Button>
              <Button onClick={handleSaveMapping} disabled={savingMapping}>
                {savingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Mapping
              </Button>
            </div>
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
