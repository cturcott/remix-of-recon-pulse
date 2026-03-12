import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, Shield } from "lucide-react";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  dealership_admin: "Dealership Admin",
  recon_manager: "Recon Manager",
  department_user: "Department User",
  read_only: "Read Only",
};

export default function Team() {
  const { currentDealership } = useDealership();
  const { isPlatformAdmin } = useAuth();
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];

      // Get user IDs assigned to this dealership
      const { data: assignments, error: aErr } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", currentDealership.id);
      if (aErr) throw aErr;
      if (!assignments || assignments.length === 0) return [];

      const userIds = assignments.map((a) => a.user_id);

      // Get profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      // Get roles for these users
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rErr) throw rErr;

      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) ?? [],
      }));
    },
    enabled: !!currentDealership,
  });

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.first_name?.toLowerCase().includes(q) ||
      m.last_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.title?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members assigned to {currentDealership?.name ?? "your dealership"}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading team...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-16">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
                  {m.first_name?.[0]}{m.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{m.first_name} {m.last_name}</p>
                  {m.title && <p className="text-sm text-muted-foreground truncate">{m.title}</p>}
                </div>
                <Badge
                  variant={m.status === "active" ? "secondary" : "outline"}
                  className="text-xs shrink-0"
                >
                  {m.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{m.email}</span>
                </div>
                {m.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{m.phone}</span>
                  </div>
                )}
              </div>

              {m.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.roles.map((role: string) => (
                    <Badge key={role} variant="outline" className="text-xs font-normal gap-1">
                      <Shield className="h-3 w-3" />
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))}
                </div>
              )}

              {m.last_login_at && (
                <p className="text-xs text-muted-foreground pt-1">
                  Last login: {new Date(m.last_login_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
