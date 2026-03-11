import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft } from "lucide-react";

export default function VehicleDetail() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No vehicle data available</p>
      </div>
    </AppLayout>
  );
}
