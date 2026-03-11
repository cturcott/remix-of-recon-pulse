import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, KeyRound, Trash2, UserCog, Building2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Dealership = Database["public"]["Tables"]["dealerships"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithDetails extends Profile {
  roles: AppRole[];
  assignedDealerships: string[];
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "dealership_admin", label: "Dealership Admin" },
  { value: "recon_manager", label: "Recon Manager" },
  { value: "department_user", label: "Department User" },
  { value: "read_only", label: "Read Only" },
];

const roleLabel = (r: AppRole) => ROLES.find((x) => x.value === r)?.label ?? r;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterDealership, setFilterDealership] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Create form
  const [createForm, setCreateForm] = useState({
    email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" as AppRole,
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", title: "", role: "department_user" as AppRole, dealershipIds: [] as string[],
  });

  const fetchData = useCallback(async () => {
    const [profilesRes, rolesRes, assignmentsRes, dealershipsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("last_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_dealership_assignments").select("*"),
      supabase.from("dealerships").select("*").eq("status", "active").order("name"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const assignments = assignmentsRes.data ?? [];

    const enriched: UserWithDetails[] = profiles.map((p) => ({
      ...p,
      roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
      assignedDealerships: assignments.filter((a) => a.user_id === p.user_id).map((a) => a.dealership_id),
    }));

    setUsers(enriched);
    setDealerships(dealershipsRes.data ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Audit log helper
  const logAudit = async (actionType: string, entityId: string | null, beforeJson: any = null, afterJson: any = null) => {
    await supabase.from("audit_logs").insert({
      actor_user_id: currentUser?.id ?? null,
      entity_type: "user",
      action_type: actionType,
      entity_id: entityId,
      before_json: beforeJson,
      after_json: afterJson,
    });
  };

  // ---- CREATE USER ----
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.first_name || !createForm.last_name) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "create_user", ...createForm },
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error creating user", description: data?.error ?? error?.message });
        return;
      }
      await logAudit("user_created", data.user_id, null, { email: createForm.email, role: createForm.role });
      toast({ title: "User created successfully" });
      setCreateDialogOpen(false);
      setCreateForm({ email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" });
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // ---- OPEN EDIT ----
  const openEdit = (u: UserWithDetails) => {
    setEditingUser(u);
    setEditForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone ?? "",
      title: u.title ?? "",
      role: u.roles[0] ?? "department_user",
      dealershipIds: [...u.assignedDealerships],
    });
    setEditSheetOpen(true);
  };

  // ---- SAVE EDIT ----
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.first_name || !editForm.last_name || !editForm.email) {
      toast({ variant: "destructive", title: "Name and email are required" });
      return;
    }
    setSaving(true);
    try {
      const beforeJson = {
        first_name: editingUser.first_name, last_name: editingUser.last_name, email: editingUser.email,
        phone: editingUser.phone, title: editingUser.title, roles: editingUser.roles, dealerships: editingUser.assignedDealerships,
      };

      // Update profile fields
      await supabase.from("profiles").update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
        title: editForm.title || null,
      }).eq("user_id", editingUser.user_id);

      // Update email if changed (requires admin API)
      if (editForm.email !== editingUser.email) {
        const { data, error } = await supabase.functions.invoke("manage-user", {
          body: { action: "update_user_email", user_id: editingUser.user_id, email: editForm.email },
        });
        if (data?.error || error) {
          toast({ variant: "destructive", title: "Error updating email", description: data?.error ?? error?.message });
          return;
        }
        // Also update profile email
        await supabase.from("profiles").update({ email: editForm.email }).eq("user_id", editingUser.user_id);
      }

      // Update role if changed
      if (editForm.role !== editingUser.roles[0]) {
        await supabase.from("user_roles").delete().eq("user_id", editingUser.user_id);
        await supabase.from("user_roles").insert({ user_id: editingUser.user_id, role: editForm.role });
        await logAudit("role_updated", editingUser.user_id, { role: editingUser.roles[0] }, { role: editForm.role });
      }

      // Update dealership assignments if changed
      const oldIds = [...editingUser.assignedDealerships].sort().join(",");
      const newIds = [...editForm.dealershipIds].sort().join(",");
      if (oldIds !== newIds) {
        await supabase.from("user_dealership_assignments").delete().eq("user_id", editingUser.user_id);
        if (editForm.dealershipIds.length > 0) {
          await supabase.from("user_dealership_assignments").insert(
            editForm.dealershipIds.map((did, i) => ({
              user_id: editingUser.user_id,
              dealership_id: did,
              is_default: i === 0,
            }))
          );
        }
        await logAudit("dealerships_updated", editingUser.user_id, { dealerships: editingUser.assignedDealerships }, { dealerships: editForm.dealershipIds });
      }

      const afterJson = { first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email, phone: editForm.phone, title: editForm.title, roles: [editForm.role], dealerships: editForm.dealershipIds };
      await logAudit("user_updated", editingUser.user_id, beforeJson, afterJson);

      toast({ title: "User updated successfully" });
      setEditSheetOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // ---- DEACTIVATE / ACTIVATE ----
  const toggleUserStatus = async (u: UserWithDetails) => {
    const newStatus = u.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("user_id", u.user_id);
    await logAudit(newStatus === "inactive" ? "user_deactivated" : "user_activated", u.user_id, { status: u.status }, { status: newStatus });
    fetchData();
    toast({ title: `User ${newStatus === "active" ? "activated" : "deactivated"}` });
  };

  // ---- PASSWORD RESET ----
  const handlePasswordReset = async (u: UserWithDetails) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", email: u.email },
      });
      if (data?.error || error) {
        toast({ variant: "destructive", title: "Error sending reset", description: data?.error ?? error?.message });
        return;
      }
      await logAudit("password_reset_sent", u.user_id);
      toast({ title: "Password reset initiated", description: `Reset link generated for ${u.email}` });
    } finally {
      setSaving(false);
    }
  };

  // ---- DELETE USER ----
  const handleDeleteUser = async (u: UserWithDetails) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete_user", user_id: u.user_id },
      });
      if (data?.error || error) {
        toast({ variant: "destructive", title: "Error deleting user", description: data?.error ?? error?.message });
        return;
      }
      await logAudit("user_deleted", u.user_id, { email: u.email, first_name: u.first_name, last_name: u.last_name });
      toast({ title: "User deleted permanently" });
      setEditSheetOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // ---- FILTERING ----
  const filtered = users.filter((u) => {
    const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    const matchesRole = filterRole === "all" || u.roles.includes(filterRole as AppRole);
    const matchesDealership = filterDealership === "all" || u.assignedDealerships.includes(filterDealership);
    return matchesSearch && matchesStatus && matchesRole && matchesDealership;
  });

  const getDealershipName = (id: string) => dealerships.find((d) => d.id === id)?.name ?? id;

  const toggleEditDealership = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      dealershipIds: prev.dealershipIds.includes(id) ? prev.dealershipIds.filter((d) => d !== id) : [...prev.dealershipIds, id],
    }));
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform users, roles, and dealership assignments</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground gap-1.5">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the platform. They will be able to sign in immediately.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>First Name *</Label><Input value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password *</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} minLength={6} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Title</Label><Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                {saving ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {dealerships.length > 0 && (
          <Select value={filterDealership} onValueChange={setFilterDealership}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Dealership" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dealerships</SelectItem>
              {dealerships.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Dealerships</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(u)}>
                  <TableCell className="font-medium text-foreground">{u.first_name} {u.last_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.title ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length > 0 ? u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs">
                          {roleLabel(r)}
                        </Badge>
                      )) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {u.assignedDealerships.length > 0
                      ? u.assignedDealerships.map((id) => getDealershipName(id)).join(", ")
                      : "None"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "secondary"} className={u.status === "active" ? "bg-status-success/20 text-status-success border-0" : "bg-status-danger/20 text-status-danger border-0"}>
                      {u.status === "active" ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Edit user">
                        <UserCog className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>Update user information, role, and dealership assignments.</SheetDescription>
          </SheetHeader>

          {editingUser && (
            <div className="mt-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge variant={editingUser.status === "active" ? "default" : "secondary"} className={editingUser.status === "active" ? "bg-status-success/20 text-status-success border-0" : "bg-status-danger/20 text-status-danger border-0"}>
                  {editingUser.status === "active" ? "Active" : "Deactivated"}
                </Badge>
                {editingUser.last_login_at && (
                  <span className="text-xs text-muted-foreground">Last login: {new Date(editingUser.last_login_at).toLocaleString()}</span>
                )}
              </div>

              {/* Profile Fields */}
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

              {/* Role */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Access Level</h3>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Dealership Assignments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Assigned Dealerships</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {dealerships.map((d) => (
                    <label key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox checked={editForm.dealershipIds.includes(d.id)} onCheckedChange={() => toggleEditDealership(d.id)} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        {d.store_code && <p className="text-xs text-muted-foreground">{d.store_code}</p>}
                      </div>
                    </label>
                  ))}
                  {dealerships.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active dealerships available.</p>}
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => handlePasswordReset(editingUser)}
                    disabled={saving}
                  >
                    <KeyRound className="h-4 w-4" />
                    Send Password Reset
                  </Button>

                  <Button
                    variant="outline"
                    className={`flex-1 ${editingUser.status === "active" ? "text-status-warning hover:text-status-warning" : "text-status-success hover:text-status-success"}`}
                    onClick={() => { toggleUserStatus(editingUser); setEditSheetOpen(false); }}
                  >
                    {editingUser.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>

                {/* Delete — only for deactivated users */}
                {editingUser.status === "inactive" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-1.5">
                        <Trash2 className="h-4 w-4" />
                        Delete User Permanently
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This user is already deactivated. Deleting them will remove their account permanently. Historical activity logs will remain for reporting and audit purposes. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(editingUser)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
