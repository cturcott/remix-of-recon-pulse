// Vehicle interface kept for reference but vehicles now come from database
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

// Legacy constant - stages now come from workflow_stages table per dealership
export const RECON_STAGES = [
  "Intake & Check-In",
  "Multi-Point Inspection",
  "Service Approvals",
  "Mechanical Repair",
  "Cosmetic & Sublet Work",
  "Professional Detail",
  "Photography & Merchandising",
  "Final QC & Front-Line Ready",
] as const;
