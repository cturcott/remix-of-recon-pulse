export interface Vehicle {
  id: string;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  acquisitionType: "trade" | "auction" | "lease_return" | "purchase" | "transfer";
  acquisitionDate: string;
  currentStage: string;
  currentStatus: "not_started" | "in_progress" | "waiting" | "blocked" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  targetFrontlineDate: string;
  daysInRecon: number;
  totalReconCost: number;
  assignedTo: string;
  photoUrl?: string;
  blockers?: string;
}

export const RECON_STAGES = [
  "Stocked",
  "Inspection",
  "Service Write-Up",
  "Estimate Review",
  "Approval Pending",
  "Mechanical",
  "Parts Waiting",
  "Sublet / Vendor",
  "Body / Paint",
  "Detail",
  "Photos",
  "QC / Final Check",
  "Frontline Ready",
] as const;
