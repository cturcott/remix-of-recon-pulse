import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

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

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [selectedDealershipIds, setSelectedDealershipIds] = useState<string[]>([]);
  const { toast } = useToast();

  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" as AppRole,
  });

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.first_name || !form.last_name) return;

    // Create auth user via edge function
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { first_name: form.first_name, last_name: form.last_name } },
    });

    if (signUpError || !signUpData.user) {
      toast({ variant: "destructive", title: "Error creating user", description: signUpError?.message ?? "Unknown error" });
      return;
    }

    // Update profile with extra fields
    await supabase.from("profiles").update({ title: form.title, phone: form.phone }).eq("user_id", signUpData.user.id);

    // Assign role
    await supabase.from("user_roles").insert({ user_id: signUpData.user.id, role: form.role });

    toast({ title: "User created successfully" });
    setDialogOpen(false);
    setForm({ email: "", password: "", first_name: "", last_name: "", title: "", phone: "", role: "department_user" });
    fetchData();
  };

  const openAssignDialog = (u: UserWithDetails) => {
    setSelectedUser(u);
    setSelectedDealershipIds(u.assignedDealerships);
    setAssignDialogOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedUser) return;

    // Delete existing assignments
    await supabase.from("user_dealership_assignments").delete().eq("user_id", selectedUser.user_id);

    // Insert new ones
    if (selectedDealershipIds.length > 0) {
      const inserts = selectedDealershipIds.map((did, i) => ({
        user_id: selectedUser.user_id,
        dealership_id: did,
        is_default: i === 0,
      }));
      await supabase.from("user_dealership_assignments").insert(inserts);
    }

    toast({ title: "Dealership assignments updated" });
    setAssignDialogOpen(false);
    fetchData();
  };

  const toggleDealership = (id: string) => {
    setSelectedDealershipIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleUserStatus = async (u: UserWithDetails) => {
    const newStatus = u.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("user_id", u.user_id);
    fetchData();
    toast({ title: `User ${newStatus === "active" ? "activated" : "deactivated"}` });
  };

  const filtered = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const getDealershipName = (id: string) => dealerships.find((d) => d.id === id)?.name ?? id;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform users and dealership assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground gap-1.5">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} className="bg-gradient-primary text-primary-foreground">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Dealerships — {selectedUser?.first_name} {selectedUser?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {dealerships.map((d) => (
              <label key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox checked={selectedDealershipIds.includes(d.id)} onCheckedChange={() => toggleDealership(d.id)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  {d.store_code && <p className="text-xs text-muted-foreground">{d.store_code}</p>}
                </div>
              </label>
            ))}
            {dealerships.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active dealerships. Create one first.</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAssignments} className="bg-gradient-primary text-primary-foreground">Save Assignments</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">{u.first_name} {u.last_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.title ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length > 0 ? u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs capitalize">
                          {r.replace("_", " ")}
                        </Badge>
                      )) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.assignedDealerships.length > 0
                      ? u.assignedDealerships.map((id) => getDealershipName(id)).join(", ")
                      : "None"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "secondary"} className={u.status === "active" ? "bg-status-success/20 text-status-success border-0" : "bg-muted text-muted-foreground border-0"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openAssignDialog(u)}>Assign</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleUserStatus(u)} className={u.status === "active" ? "text-status-warning" : "text-status-success"}>
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
