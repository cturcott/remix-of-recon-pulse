import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export default function DealershipSwitcher() {
  const { dealerships, currentDealership, setCurrentDealership } = useDealership();
  const { isPlatformAdmin } = useAuth();

  if (dealerships.length === 0) return null;

  // Single dealership — just show the name
  if (dealerships.length === 1 && !isPlatformAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-medium truncate max-w-[200px]">{dealerships[0].name}</span>
      </div>
    );
  }

  return (
    <Select
      value={currentDealership?.id ?? ""}
      onValueChange={(id) => {
        const d = dealerships.find((d) => d.id === id);
        if (d) setCurrentDealership(d);
      }}
    >
      <SelectTrigger className="w-[220px] border-border bg-card">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Select dealership" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {dealerships.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            <div className="flex items-center gap-2">
              <span>{d.name}</span>
              {d.store_code && (
                <span className="text-xs text-muted-foreground">({d.store_code})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
