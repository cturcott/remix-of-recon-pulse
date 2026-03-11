import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Building2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Dealership = Database["public"]["Tables"]["dealerships"]["Row"];

export default function DealershipManagement() {
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dealership | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", legal_name: "", store_code: "", address: "", city: "", state: "", zip: "", phone: "",
    primary_contact_name: "", primary_contact_email: "", timezone: "America/New_York",
  });

  const fetchDealerships = async () => {
    const { data } = await supabase.from("dealerships").select("*").order("name");
    setDealerships(data ?? []);
  };

  useEffect(() => { fetchDealerships(); }, []);

  const resetForm = () => {
    setForm({ name: "", legal_name: "", store_code: "", address: "", city: "", state: "", zip: "", phone: "", primary_contact_name: "", primary_contact_email: "", timezone: "America/New_York" });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editing) {
      const { error } = await supabase.from("dealerships").update(form).eq("id", editing.id);
      if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
      toast({ title: "Dealership updated" });
    } else {
      const { error } = await supabase.from("dealerships").insert(form);
      if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
      toast({ title: "Dealership created" });
    }
    setDialogOpen(false);
    resetForm();
    fetchDealerships();
  };

  const toggleStatus = async (d: Dealership) => {
    const newStatus = d.status === "active" ? "inactive" : "active";
    await supabase.from("dealerships").update({ status: newStatus }).eq("id", d.id);
    fetchDealerships();
    toast({ title: `Dealership ${newStatus === "active" ? "activated" : "deactivated"}` });
  };

  const openEdit = (d: Dealership) => {
    setEditing(d);
    setForm({
      name: d.name, legal_name: d.legal_name ?? "", store_code: d.store_code ?? "",
      address: d.address ?? "", city: d.city ?? "", state: d.state ?? "", zip: d.zip ?? "",
      phone: d.phone ?? "", primary_contact_name: d.primary_contact_name ?? "",
      primary_contact_email: d.primary_contact_email ?? "", timezone: d.timezone ?? "America/New_York",
    });
    setDialogOpen(true);
  };

  const filtered = dealerships.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.store_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dealerships</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all platform dealerships</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground gap-1.5">
              <Plus className="h-4 w-4" /> Add Dealership
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Dealership" : "Create Dealership"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Dealership Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Store Code</Label><Input value={form.store_code} onChange={(e) => setForm({ ...form, store_code: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Legal Name</Label><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-2"><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Time Zone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Contact Name</Label><Input value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contact Email</Label><Input value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gradient-primary text-primary-foreground">
                {editing ? "Save Changes" : "Create Dealership"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search dealerships..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Store Code</TableHead>
              <TableHead>City / State</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No dealerships found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.store_code ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.primary_contact_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "active" ? "default" : "secondary"} className={d.status === "active" ? "bg-status-success/20 text-status-success border-0" : "bg-muted text-muted-foreground border-0"}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(d)} className={d.status === "active" ? "text-status-warning" : "text-status-success"}>
                        {d.status === "active" ? "Deactivate" : "Activate"}
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
