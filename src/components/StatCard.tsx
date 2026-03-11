import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
}

export default function StatCard({ label, value, change, changeType = "neutral", icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-card-foreground animate-count-up">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              changeType === "positive" ? "text-status-success" :
              changeType === "negative" ? "text-status-danger" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}
