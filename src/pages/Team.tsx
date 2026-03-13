import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Users, Search, Mail, Phone, Shield, Plus, UserCog, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { isPasswordValid } from "@/lib/passwordValidation";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const TEAM_ROLES: { value: AppRole; label: string }[] = [
  { value: "dealership_admin", label: "Dealership Admin" },
  { value: "recon_manager", label: "Recon Manager" },
  { value: "department_user", label: "Department User" },
  { value: "read_only", label: "Read Only" },
];

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  dealership_admin: "Dealership Admin",
  recon_manager: "Recon Manager",
  department_user: "Department User",
  read_only: "Read Only",
};

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  title: string | null;
  status: string;
  last_login_at: string | null;
  roles: string[];
}

export default function Team() {
  const { currentDealership } = useDealership();
  const { roles, isPlatformAdmin } = useAuth();
  const isDealershipAdmin = roles.includes("dealership_admin") || isPlatformAdmin;
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createForm, setCreateForm] = useState({
    email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" as AppRole,
  });
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", title: "", role: "department_user" as AppRole,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return [];

      const { data: assignments, error: aErr } = await supabase
        .from("user_dealership_assignments")
        .select("user_id")
        .eq("dealership_id", currentDealership.id);
      if (aErr) throw aErr;
      if (!assignments || assignments.length === 0) return [];

      const userIds = assignments.map((a) => a.user_id);

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const { data: userRoles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rErr) throw rErr;

      const roleMap = new Map<string, string[]>();
      (userRoles ?? []).forEach((r) => {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      return (profiles ?? [])
        .map((p) => ({
          ...p,
          roles: roleMap.get(p.user_id) ?? [],
        }))
        // Filter out platform admins
        .filter((m) => !m.roles.includes("platform_admin"));
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

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.first_name || !createForm.last_name) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    if (!isPasswordValid(createForm.password)) {
      toast({ variant: "destructive", title: "Password does not meet requirements" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create_user",
          ...createForm,
          dealership_id: currentDealership?.id,
        },
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error creating user", description: data?.error ?? error?.message });
        return;
      }
      toast({ title: "User created successfully", description: "A welcome email has been sent with their login credentials." });
      setCreateOpen(false);
      setCreateForm({ email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    setEditForm({
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      phone: m.phone ?? "",
      title: m.title ?? "",
      role: (m.roles.find((r) => r !== "platform_admin") as AppRole) ?? "department_user",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    if (!editForm.first_name || !editForm.last_name || !editForm.email) {
      toast({ variant: "destructive", title: "Name and email are required" });
      return;
    }
    setSaving(true);
    try {
      // Update profile
      await supabase.from("profiles").update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
        title: editForm.title || null,
      }).eq("user_id", editingMember.user_id);

      // Update email if changed
      if (editForm.email !== editingMember.email) {
        const { data, error } = await supabase.functions.invoke("manage-user", {
          body: { action: "update_user_email", user_id: editingMember.user_id, email: editForm.email },
        });
        if (data?.error || error) {
          toast({ variant: "destructive", title: "Error updating email", description: data?.error ?? error?.message });
          setSaving(false);
          return;
        }
        await supabase.from("profiles").update({ email: editForm.email }).eq("user_id", editingMember.user_id);
      }

      // Update role if changed
      const currentRole = editingMember.roles.find((r) => r !== "platform_admin");
      if (editForm.role !== currentRole) {
        await supabase.from("user_roles").delete().eq("user_id", editingMember.user_id);
        await supabase.from("user_roles").insert({ user_id: editingMember.user_id, role: editForm.role });
      }

      toast({ title: "Team member updated" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!editingMember) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", email: editingMember.email },
      });
      if (data?.error || error) {
        toast({ variant: "destructive", title: "Error", description: data?.error ?? error?.message });
        return;
      }
      toast({ title: "Password reset initiated", description: `A notification has been sent to ${editingMember.email}` });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!editingMember) return;
    const newStatus = editingMember.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("user_id", editingMember.user_id);
    toast({ title: `User ${newStatus === "active" ? "activated" : "deactivated"}` });
    setEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Members assigned to {currentDealership?.name ?? "your dealership"}
          </p>
        </div>
        {isDealershipAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground gap-1.5">
                <Plus className="h-4 w-4" /> Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>Create a new user and assign them to {currentDealership?.name}.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>First Name *</Label><Input value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Last Name *</Label><Input value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Temporary Password *</Label>
                  <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                  <PasswordStrengthIndicator password={createForm.password} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Title</Label><Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={saving || !isPasswordValid(createForm.password)}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {saving ? "Creating..." : "Create & Send Welcome Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
            <div
              key={m.id}
              className={`rounded-xl border border-border bg-card p-5 space-y-3 ${isDealershipAdmin ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
              onClick={() => isDealershipAdmin && openEdit(m)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
                  {m.first_name?.[0]}{m.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{m.first_name} {m.last_name}</p>
                  {m.title && <p className="text-sm text-muted-foreground truncate">{m.title}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant={m.status === "active" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {m.status}
                  </Badge>
                  {isDealershipAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                      <UserCog className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Team Member</SheetTitle>
            <SheetDescription>Update information and access level.</SheetDescription>
          </SheetHeader>

          {editingMember && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-2">
                <Badge variant={editingMember.status === "active" ? "default" : "secondary"}>
                  {editingMember.status === "active" ? "Active" : "Deactivated"}
                </Badge>
                {editingMember.last_login_at && (
                  <span className="text-xs text-muted-foreground">Last login: {new Date(editingMember.last_login_at).toLocaleString()}</span>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Profile Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>First Name *</Label><Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Last Name *</Label><Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Title</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Access Level</h3>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={handlePasswordReset} disabled={saving}>
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </Button>
                  <Button
                    variant="outline"
                    className={`flex-1 ${editingMember.status === "active" ? "text-destructive hover:text-destructive" : "text-primary hover:text-primary"}`}
                    onClick={toggleStatus}
                  >
                    {editingMember.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
