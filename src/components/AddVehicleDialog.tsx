import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDealership } from "@/contexts/DealershipContext";
import VinScanner from "@/components/VinScanner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DecodedVehicle {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_style: string | null;
  engine: string | null;
  drivetrain: string | null;
  fuel_type: string | null;
}

const ACQUISITION_SOURCES = ["Trade-In", "Auction", "Lease Return", "Purchase", "Transfer", "Other"];

export default function AddVehicleDialog() {
  const { currentDealership } = useDealership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [vin, setVin] = useState("");
  const [decodeStatus, setDecodeStatus] = useState<"idle" | "loading" | "success" | "partial" | "failed">("idle");
  const [decoded, setDecoded] = useState<DecodedVehicle | null>(null);

  // Form fields
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [bodyStyle, setBodyStyle] = useState("");
  const [engine, setEngine] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [mileage, setMileage] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [exteriorColor, setExteriorColor] = useState("");
  const [interiorColor, setInteriorColor] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [acv, setAcv] = useState("");
  const [lotLocation, setLotLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setVin("");
    setDecodeStatus("idle");
    setDecoded(null);
    setYear(""); setMake(""); setModel(""); setTrim("");
    setBodyStyle(""); setEngine(""); setDrivetrain(""); setFuelType("");
    setMileage(""); setStockNumber(""); setExteriorColor(""); setInteriorColor("");
    setAcquisitionSource(""); setAcv(""); setLotLocation(""); setNotes("");
  };

  const handleDecode = async () => {
    if (vin.length !== 17) {
      toast.error("VIN must be exactly 17 characters");
      return;
    }
    setDecodeStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", {
        body: { vin },
      });
      if (error) throw error;

      if (data.decode_status === "success" || data.decode_status === "partial") {
        const d = data.decoded as DecodedVehicle;
        setDecoded(d);
        if (d.year) setYear(String(d.year));
        if (d.make) setMake(d.make);
        if (d.model) setModel(d.model);
        if (d.trim) setTrim(d.trim);
        if (d.body_style) setBodyStyle(d.body_style);
        if (d.engine) setEngine(d.engine);
        if (d.drivetrain) setDrivetrain(d.drivetrain);
        if (d.fuel_type) setFuelType(d.fuel_type);
        setDecodeStatus(data.decode_status);
      } else {
        setDecodeStatus("failed");
        toast.error("Unable to decode VIN. Please enter vehicle details manually.");
      }

      // Log decode
      await supabase.from("vin_decode_logs").insert({
        vin,
        decode_status: data.decode_status,
        decode_payload: data.decoded ?? data,
        created_by: user?.id,
      });
    } catch (err: any) {
      setDecodeStatus("failed");
      toast.error("VIN decode failed. You can enter details manually.");
    }
  };

  const handleSave = async () => {
    if (!currentDealership) {
      toast.error("No dealership selected");
      return;
    }
    if (!vin || vin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN");
      return;
    }
    if (!mileage) {
      toast.error("Mileage is required");
      return;
    }

    setSaving(true);
    try {
      // Get the starting stage for this dealership
      const { data: startStage } = await supabase
        .from("workflow_stages")
        .select("id")
        .eq("dealership_id", currentDealership.id)
        .eq("is_start_stage", true)
        .eq("is_active", true)
        .single();

      const { data: vehicle, error } = await supabase
        .from("vehicles")
        .insert({
          dealership_id: currentDealership.id,
          vin: vin.toUpperCase(),
          year: year ? parseInt(year) : null,
          make: make || null,
          model: model || null,
          trim: trim || null,
          body_style: bodyStyle || null,
          engine: engine || null,
          drivetrain: drivetrain || null,
          fuel_type: fuelType || null,
          exterior_color: exteriorColor || null,
          interior_color: interiorColor || null,
          mileage: parseInt(mileage),
          stock_number: stockNumber || null,
          acquisition_source: acquisitionSource || null,
          acv: acv ? parseFloat(acv) : null,
          lot_location: lotLocation || null,
          notes: notes || null,
          current_stage_id: startStage?.id ?? null,
          created_by: user?.id,
          status: "in_recon",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A vehicle with this VIN already exists at this dealership");
        } else {
          throw error;
        }
        return;
      }

      // Log initial stage entry
      if (startStage && vehicle) {
        await supabase.from("vehicle_stage_history").insert({
          vehicle_id: vehicle.id,
          dealership_id: currentDealership.id,
          to_stage_id: startStage.id,
          changed_by: user?.id,
          note: "Vehicle intake",
        });
      }

      toast.success(`Vehicle ${year} ${make} ${model} added successfully`);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[90vh] max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:border-0">
        <DialogHeader>
          <DialogTitle>Add Vehicle to Recon</DialogTitle>
        </DialogHeader>

        {/* VIN Decode Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vin">VIN *</Label>
            <div className="flex gap-2">
              <Input
                id="vin"
                placeholder="Enter 17-character VIN"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17))}
                maxLength={17}
                className="font-mono tracking-wider"
              />
              <VinScanner onScan={(scannedVin) => { setVin(scannedVin); setDecodeStatus("idle"); }} />
              <Button
                type="button"
                variant="secondary"
                onClick={handleDecode}
                disabled={vin.length !== 17 || decodeStatus === "loading"}
              >
                {decodeStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decode"}
              </Button>
            </div>
            {decodeStatus === "success" && (
              <p className="text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> VIN decoded successfully
              </p>
            )}
            {decodeStatus === "partial" && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Partial decode — review and complete details
              </p>
            )}
            {decodeStatus === "failed" && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Unable to decode VIN. Enter details manually.
              </p>
            )}
          </div>

          {/* Vehicle Details Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="make">Make</Label>
              <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trim">Trim</Label>
              <Input id="trim" value={trim} onChange={(e) => setTrim(e.target.value)} placeholder="SE" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bodyStyle">Body Style</Label>
              <Input id="bodyStyle" value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)} placeholder="Sedan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="engine">Engine</Label>
              <Input id="engine" value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="2.5L 4cyl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drivetrain">Drivetrain</Label>
              <Input id="drivetrain" value={drivetrain} onChange={(e) => setDrivetrain(e.target.value)} placeholder="FWD" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Input id="fuelType" value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="Gasoline" />
            </div>
          </div>

          {/* Intake Fields */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Intake Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mileage">Mileage *</Label>
                <Input id="mileage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="45000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stockNumber">Stock Number</Label>
                <Input id="stockNumber" value={stockNumber} onChange={(e) => setStockNumber(e.target.value)} placeholder="Auto or manual" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extColor">Exterior Color</Label>
                <Input id="extColor" value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} placeholder="Silver" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intColor">Interior Color</Label>
                <Input id="intColor" value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} placeholder="Black" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source">Acquisition Source</Label>
                <Select value={acquisitionSource} onValueChange={setAcquisitionSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACQUISITION_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acv">ACV / Acquisition Cost</Label>
                <Input id="acv" type="number" value={acv} onChange={(e) => setAcv(e.target.value)} placeholder="15000" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lot">Lot Location</Label>
                <Input id="lot" value={lotLocation} onChange={(e) => setLotLocation(e.target.value)} placeholder="Main lot, Row B" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any intake notes..." rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !vin || !mileage}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save & Enter Workflow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
