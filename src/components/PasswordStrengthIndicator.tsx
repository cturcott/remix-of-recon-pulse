import { validatePassword } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";

export default function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = validatePassword(password);
  if (!password) return null;

  return (
    <ul className="space-y-1 mt-2">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.met ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          <span className={c.met ? "text-muted-foreground" : "text-destructive"}>
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
