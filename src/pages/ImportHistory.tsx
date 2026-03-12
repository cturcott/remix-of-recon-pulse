import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { Loader2, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  completed: "default",
  completed_with_issues: "secondary",
  failed: "destructive",
  processing: "outline",
  pending: "outline",
};

export default function ImportHistory() {
  const { currentDealership } = useDealership();

  const { data: batches, isLoading } = useQuery({
    queryKey: ["import-batches", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .eq("dealership_id", currentDealership.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentDealership,
  });

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/import/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import History</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentDealership?.name} — CSV import batch log</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !batches?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No imports yet. Run your first import from Import Settings.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">File</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Success</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Failed</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Skipped</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{batch.source_file_name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[batch.batch_status] as any || "outline"}>
                      {batch.batch_status?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">{batch.total_rows}</td>
                  <td className="px-4 py-3 text-center text-primary font-medium">{batch.success_rows}</td>
                  <td className="px-4 py-3 text-center text-destructive font-medium">{batch.failed_rows}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{batch.skipped_rows}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {batch.created_at ? format(new Date(batch.created_at), "MMM d, yyyy h:mm a") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/import/batch/${batch.id}`}>
                      <Button variant="ghost" size="sm">Detail</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
