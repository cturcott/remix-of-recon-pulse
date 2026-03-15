import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: "default" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
}

export default function KpiCard({ label, value, subValue, variant = "default", icon }: KpiCardProps) {
  return (
    <div className={cn(
      "flex flex-col rounded-lg border p-3 sm:p-4 min-w-[120px]",
      variant === "danger" && "border-destructive/30 bg-destructive/5",
      variant === "warning" && "border-yellow-500/30 bg-yellow-500/5",
      variant === "success" && "border-green-500/30 bg-green-500/5",
      variant === "default" && "border-border bg-card",
    )}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={cn(
        "text-xl sm:text-2xl font-bold",
        variant === "danger" && "text-destructive",
        variant === "warning" && "text-yellow-600",
        variant === "success" && "text-green-600",
        variant === "default" && "text-foreground",
      )}>
        {value}
      </div>
      {subValue && <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>}
    </div>
  );
}
