import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, SkipForward } from "lucide-react";
import { format } from "date-fns";

const outcomeIcon: Record<string, any> = {
  success: <CheckCircle2 className="h-4 w-4 text-primary" />,
  imported_with_warnings: <AlertTriangle className="h-4 w-4 text-accent-foreground" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
  needs_review: <AlertTriangle className="h-4 w-4 text-accent-foreground" />,
  pending: <Loader2 className="h-4 w-4 text-muted-foreground" />,
};

export default function ImportBatchDetail() {
  const { batchId } = useParams();

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["import-batch", batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .eq("id", batchId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!batchId,
  });

  const { data: rows, isLoading: rowsLoading } = useQuery({
    queryKey: ["import-batch-rows", batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batch_rows")
        .select("*")
        .eq("batch_id", batchId!)
        .order("row_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!batchId,
  });

  const isLoading = batchLoading || rowsLoading;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/import/history">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Batch Detail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {batch?.source_file_name || "Import"} — {batch?.created_at ? format(new Date(batch.created_at), "MMM d, yyyy h:mm a") : ""}
          </p>
        </div>
        <Link to={`/import/settings?remap_batch=${batchId}`}>
          <Button variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-1" /> Correct Mapping & Re-import
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{batch?.total_rows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Rows</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-2xl font-bold text-primary">{batch?.success_rows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Imported</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{batch?.failed_rows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{batch?.skipped_rows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-accent-foreground">{batch?.warning_rows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </div>

          {/* Rows */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">VIN</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Stock #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Vehicle</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">VIN Decode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Duplicate</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Errors</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).map(row => {
                    const mapped = (row.mapped_row_json || {}) as Record<string, any>;
                    const errors = (row.validation_errors_json || []) as string[];
                    return (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                        <td className="px-3 py-2">{outcomeIcon[row.final_outcome] || row.final_outcome}</td>
                        <td className="px-3 py-2 font-mono text-xs">{mapped.vin || "—"}</td>
                        <td className="px-3 py-2">{mapped.stock_number || "—"}</td>
                        <td className="px-3 py-2 text-xs">{[mapped.year, mapped.make, mapped.model].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={row.vin_decode_status === "success" ? "default" : row.vin_decode_status === "failed" ? "destructive" : "outline"} className="text-xs">
                            {row.vin_decode_status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {row.duplicate_status !== "none" && (
                            <Badge variant="secondary" className="text-xs">{row.duplicate_status}</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-destructive text-xs max-w-48 truncate">{errors.join("; ")}</td>
                        <td className="px-3 py-2">
                          {row.created_vehicle_id && (
                            <Link to={`/vehicle/${row.created_vehicle_id}`}>
                              <Button variant="ghost" size="sm" className="text-xs">View</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
