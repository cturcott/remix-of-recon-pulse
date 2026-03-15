import { ReactNode, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Download, Bookmark, Trash2, ChevronDown, Search } from "lucide-react";
import { exportToCSV } from "@/lib/reportExport";
import { useSavedViews, SavedView } from "@/hooks/useSavedViews";

interface ReportLayoutProps {
  title: string;
  description: string;
  reportType: string;
  children: ReactNode;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: Record<string, any>;
  sort: Record<string, any>;
  onApplyView: (filters: Record<string, any>, sort: Record<string, any>) => void;
  exportData?: Record<string, any>[];
  exportFilename?: string;
  totalCount?: number;
  filterBar?: ReactNode;
  kpiBar?: ReactNode;
}

export default function ReportLayout({
  title, description, reportType, children,
  searchQuery, onSearchChange, filters, sort, onApplyView,
  exportData, exportFilename, totalCount, filterBar, kpiBar,
}: ReportLayoutProps) {
  const { views, saveView, deleteView } = useSavedViews(reportType);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const handleSave = () => {
    if (!viewName.trim()) return;
    saveView.mutate({ name: viewName.trim(), filters, sort });
    setViewName("");
    setSaveDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Saved Views */}
            {views.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Bookmark className="h-3.5 w-3.5" />
                    Saved Views
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {views.map((v: SavedView) => (
                    <DropdownMenuItem key={v.id} className="flex items-center justify-between">
                      <span
                        className="flex-1 cursor-pointer"
                        onClick={() => onApplyView(v.filters_json, v.sort_json)}
                      >
                        {v.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteView.mutate(v.id); }}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} className="gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              Save View
            </Button>
            {exportData && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportToCSV(exportData, exportFilename || reportType)}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportToCSV(exportData, exportFilename || reportType)}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* KPI Bar */}
        {kpiBar}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search VIN, stock #, vehicle..."
              className="h-9 pl-8 text-[16px] sm:text-sm"
            />
          </div>
          {filterBar}
        </div>

        {/* Count */}
        {totalCount != null && (
          <div className="text-xs text-muted-foreground">
            Showing <strong>{totalCount}</strong> result{totalCount !== 1 ? "s" : ""}
          </div>
        )}

        {/* Content */}
        {children}
      </div>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <Input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="e.g. My overdue units"
            className="text-[16px] sm:text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!viewName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
