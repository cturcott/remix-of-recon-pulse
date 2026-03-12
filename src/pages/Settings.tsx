import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, Building2, User, Bell, Shield, Loader2, Timer } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  const { currentDealership } = useDealership();
  const { profile, user, isPlatformAdmin, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDealershipAdmin = isPlatformAdmin || roles.includes("dealership_admin");

  // Profile form
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [title, setTitle] = useState(profile?.title ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Dealership form
  const { data: dealership } = useQuery({
    queryKey: ["dealership-detail", currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership) return null;
      const { data, error } = await supabase
        .from("dealerships")
        .select("*")
        .eq("id", currentDealership.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership,
  });

  const [dealerName, setDealerName] = useState("");
  const [dealerPhone, setDealerPhone] = useState("");
  const [dealerAddress, setDealerAddress] = useState("");
  const [dealerCity, setDealerCity] = useState("");
  const [dealerState, setDealerState] = useState("");
  const [dealerZip, setDealerZip] = useState("");
  const [dealerContact, setDealerContact] = useState("");
  const [dealerEmail, setDealerEmail] = useState("");
  const [savingDealer, setSavingDealer] = useState(false);

  // Populate dealership form when data loads
  useState(() => {
    if (dealership) {
      setDealerName(dealership.name ?? "");
      setDealerPhone(dealership.phone ?? "");
      setDealerAddress(dealership.address ?? "");
      setDealerCity(dealership.city ?? "");
      setDealerState(dealership.state ?? "");
      setDealerZip(dealership.zip ?? "");
      setDealerContact(dealership.primary_contact_name ?? "");
      setDealerEmail(dealership.primary_contact_email ?? "");
    }
  });

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          title: title || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveDealership = async () => {
    if (!currentDealership) return;
    setSavingDealer(true);
    try {
      const { error } = await supabase
        .from("dealerships")
        .update({
          name: dealerName,
          phone: dealerPhone || null,
          address: dealerAddress || null,
          city: dealerCity || null,
          state: dealerState || null,
          zip: dealerZip || null,
          primary_contact_name: dealerContact || null,
          primary_contact_email: dealerEmail || null,
        })
        .eq("id", currentDealership.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["dealership-detail"] });
      toast.success("Dealership settings updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update dealership");
    } finally {
      setSavingDealer(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and dealership configuration</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Profile Section */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Your Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Used Car Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Contact an admin to change your email</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Profile
            </Button>
          </div>
        </section>

        {/* Dealership Section */}
        {isDealershipAdmin && currentDealership && (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Dealership Info</h2>
              <Badge variant="outline" className="text-xs ml-auto">Admin Only</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Dealership Name</Label>
                <Input value={dealerName} onChange={(e) => setDealerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={dealerPhone} onChange={(e) => setDealerPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Primary Contact</Label>
                <Input value={dealerContact} onChange={(e) => setDealerContact(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Contact Email</Label>
                <Input value={dealerEmail} onChange={(e) => setDealerEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={dealerAddress} onChange={(e) => setDealerAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={dealerCity} onChange={(e) => setDealerCity(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label>State</Label>
                  <Input value={dealerState} onChange={(e) => setDealerState(e.target.value)} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>ZIP</Label>
                  <Input value={dealerZip} onChange={(e) => setDealerZip(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button size="sm" onClick={handleSaveDealership} disabled={savingDealer}>
                {savingDealer ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Dealership
              </Button>
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Configuration</h2>
          <div className="space-y-3">
            <Link
              to="/settings/workflow"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Workflow Stages</p>
                <p className="text-sm text-muted-foreground">Customize the reconditioning workflow for this dealership</p>
              </div>
              <Badge variant="outline">Configure</Badge>
            </Link>
            <Link
              to="/settings/notifications"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Workflow Notifications</p>
                <p className="text-sm text-muted-foreground">Configure who gets notified when vehicles move through stages</p>
              </div>
              <Badge variant="outline">Configure</Badge>
            </Link>
            <Link
              to="/team"
              className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Team Members</p>
                <p className="text-sm text-muted-foreground">View and manage your dealership team</p>
              </div>
              <Badge variant="outline">View</Badge>
            </Link>
            {isPlatformAdmin && (
              <Link
                to="/admin"
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Platform Administration</p>
                    <p className="text-sm text-muted-foreground">Manage dealerships, users, and platform settings</p>
                  </div>
                </div>
                <Badge variant="outline">Admin</Badge>
              </Link>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
