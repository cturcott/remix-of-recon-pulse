import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import { Building2, Users, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeDealerships: 0, inactiveDealerships: 0, totalUsers: 0, unassignedUsers: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [dealerships, profiles, assignments] = await Promise.all([
        supabase.from("dealerships").select("status"),
        supabase.from("profiles").select("user_id"),
        supabase.from("user_dealership_assignments").select("user_id"),
      ]);

      const active = dealerships.data?.filter((d) => d.status === "active").length ?? 0;
      const inactive = dealerships.data?.filter((d) => d.status === "inactive").length ?? 0;
      const totalUsers = profiles.data?.length ?? 0;
      const assignedUserIds = new Set(assignments.data?.map((a) => a.user_id));
      const unassigned = (profiles.data ?? []).filter((p) => !assignedUserIds.has(p.user_id)).length;

      setStats({ activeDealerships: active, inactiveDealerships: inactive, totalUsers, unassignedUsers: unassigned });
    };
    fetch();
  }, []);

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage dealerships, users, and platform settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Dealerships" value={stats.activeDealerships} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Inactive Dealerships" value={stats.inactiveDealerships} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Unassigned Users" value={stats.unassignedUsers} icon={<CheckCircle className="h-5 w-5" />} changeType={stats.unassignedUsers > 0 ? "negative" : undefined} change={stats.unassignedUsers > 0 ? "Needs attention" : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/admin/dealerships" className="group">
          <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Manage Dealerships</h3>
            </div>
            <p className="text-sm text-muted-foreground">Create, edit, and manage dealership records and status.</p>
          </div>
        </Link>

        <Link to="/admin/users" className="group">
          <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Manage Users</h3>
            </div>
            <p className="text-sm text-muted-foreground">Create users, assign dealerships, and manage roles.</p>
          </div>
        </Link>

        <Link to="/admin/email-settings" className="group">
          <div className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Email Settings (Postmark)</h3>
            </div>
            <p className="text-sm text-muted-foreground">Configure Postmark server token, sender settings, and test delivery.</p>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
}
