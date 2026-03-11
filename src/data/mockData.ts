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

export const mockVehicles: Vehicle[] = [
  { id: "1", vin: "1HGCV1F34LA0", stockNumber: "A1024", year: 2023, make: "Honda", model: "Accord", trim: "Sport", mileage: 18420, acquisitionType: "trade", acquisitionDate: "2026-03-05", currentStage: "Mechanical", currentStatus: "in_progress", priority: "high", targetFrontlineDate: "2026-03-14", daysInRecon: 6, totalReconCost: 1240, assignedTo: "Mike Torres" },
  { id: "2", vin: "5YFBURHE1LP3", stockNumber: "A1031", year: 2024, make: "Toyota", model: "Camry", trim: "XSE", mileage: 8910, acquisitionType: "auction", acquisitionDate: "2026-03-07", currentStage: "Detail", currentStatus: "in_progress", priority: "normal", targetFrontlineDate: "2026-03-13", daysInRecon: 4, totalReconCost: 680, assignedTo: "Sarah Kim" },
  { id: "3", vin: "WBAJB0C51JB1", stockNumber: "A1018", year: 2022, make: "BMW", model: "530i", trim: "xDrive", mileage: 32100, acquisitionType: "trade", acquisitionDate: "2026-03-01", currentStage: "Approval Pending", currentStatus: "waiting", priority: "urgent", targetFrontlineDate: "2026-03-12", daysInRecon: 10, totalReconCost: 3200, assignedTo: "James Wright", blockers: "Estimate exceeds $3,000 threshold" },
  { id: "4", vin: "3GNKBKRS2MS4", stockNumber: "A1029", year: 2023, make: "Chevrolet", model: "Equinox", trim: "LT", mileage: 25600, acquisitionType: "auction", acquisitionDate: "2026-03-06", currentStage: "Parts Waiting", currentStatus: "blocked", priority: "high", targetFrontlineDate: "2026-03-15", daysInRecon: 5, totalReconCost: 890, assignedTo: "David Chen", blockers: "Rear bumper cover on backorder — ETA 3/14" },
  { id: "5", vin: "1G1YY22G765", stockNumber: "A1033", year: 2024, make: "Chevrolet", model: "Corvette", trim: "Stingray", mileage: 3200, acquisitionType: "trade", acquisitionDate: "2026-03-08", currentStage: "Inspection", currentStatus: "in_progress", priority: "urgent", targetFrontlineDate: "2026-03-12", daysInRecon: 3, totalReconCost: 0, assignedTo: "Mike Torres" },
  { id: "6", vin: "2T1BURHE4KC8", stockNumber: "A1015", year: 2021, make: "Toyota", model: "Corolla", trim: "LE", mileage: 45200, acquisitionType: "auction", acquisitionDate: "2026-02-27", currentStage: "QC / Final Check", currentStatus: "in_progress", priority: "normal", targetFrontlineDate: "2026-03-11", daysInRecon: 12, totalReconCost: 2100, assignedTo: "Lisa Park" },
  { id: "7", vin: "5J8TC2H56PL2", stockNumber: "A1036", year: 2025, make: "Acura", model: "MDX", trim: "Type S", mileage: 1200, acquisitionType: "trade", acquisitionDate: "2026-03-09", currentStage: "Stocked", currentStatus: "not_started", priority: "high", targetFrontlineDate: "2026-03-16", daysInRecon: 2, totalReconCost: 0, assignedTo: "Unassigned" },
  { id: "8", vin: "WA1LAAF77ND0", stockNumber: "A1022", year: 2022, make: "Audi", model: "Q5", trim: "Premium Plus", mileage: 28400, acquisitionType: "lease_return", acquisitionDate: "2026-03-03", currentStage: "Body / Paint", currentStatus: "in_progress", priority: "normal", targetFrontlineDate: "2026-03-14", daysInRecon: 8, totalReconCost: 1850, assignedTo: "Carlos Mendez" },
  { id: "9", vin: "1FMCU9J96MU1", stockNumber: "A1027", year: 2023, make: "Ford", model: "Escape", trim: "SEL", mileage: 19800, acquisitionType: "trade", acquisitionDate: "2026-03-05", currentStage: "Sublet / Vendor", currentStatus: "waiting", priority: "normal", targetFrontlineDate: "2026-03-15", daysInRecon: 6, totalReconCost: 1420, assignedTo: "Premier Auto Glass" },
  { id: "10", vin: "KNAE35L17NA0", stockNumber: "A1010", year: 2022, make: "Kia", model: "EV6", trim: "Wind", mileage: 22100, acquisitionType: "auction", acquisitionDate: "2026-02-25", currentStage: "Frontline Ready", currentStatus: "completed", priority: "normal", targetFrontlineDate: "2026-03-08", daysInRecon: 14, totalReconCost: 2650, assignedTo: "Lisa Park" },
  { id: "11", vin: "3MW5R1J00M8T", stockNumber: "A1038", year: 2024, make: "BMW", model: "M340i", trim: "xDrive", mileage: 6500, acquisitionType: "trade", acquisitionDate: "2026-03-10", currentStage: "Service Write-Up", currentStatus: "in_progress", priority: "high", targetFrontlineDate: "2026-03-17", daysInRecon: 1, totalReconCost: 0, assignedTo: "James Wright" },
  { id: "12", vin: "JN1TBNT32Z00", stockNumber: "A1020", year: 2023, make: "Nissan", model: "Z", trim: "Performance", mileage: 11200, acquisitionType: "purchase", acquisitionDate: "2026-03-02", currentStage: "Photos", currentStatus: "in_progress", priority: "normal", targetFrontlineDate: "2026-03-13", daysInRecon: 9, totalReconCost: 1680, assignedTo: "Sarah Kim" },
];

export const dashboardStats = {
  totalInRecon: 11,
  avgDaysInRecon: 6.4,
  avgTimeToLine: 8.2,
  completedToday: 3,
  overdueVehicles: 2,
  waitingApproval: 1,
  waitingParts: 1,
  avgReconCost: 1590,
  holdingCostPerDay: 45,
};
