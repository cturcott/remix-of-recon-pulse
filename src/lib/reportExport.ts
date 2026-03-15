export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val == null) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(data: Record<string, any>[], filename: string) {
  // Simple XLSX via TSV with .xlsx extension — browsers handle it
  // For proper XLSX we'd need a library, but CSV works for most dealership use cases
  exportToCSV(data, filename);
}

export function formatDays(days: number | undefined): string {
  if (days == null) return "—";
  if (days < 1) return "< 1d";
  return `${Math.round(days)}d`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
