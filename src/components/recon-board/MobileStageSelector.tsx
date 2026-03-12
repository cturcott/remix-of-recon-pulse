import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Stage {
  id: string;
  name: string;
  vehicleCount: number;
  warningCount: number;
  dangerCount: number;
}

interface MobileStageSelectorProps {
  stages: Stage[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
}

export default function MobileStageSelector({
  stages,
  selectedStageId,
  onSelectStage,
}: MobileStageSelectorProps) {
  return (
    <Select value={selectedStageId ?? ""} onValueChange={onSelectStage}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a stage" />
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            <div className="flex items-center gap-2">
              <span>{stage.name}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {stage.vehicleCount}
              </Badge>
              {stage.dangerCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                  {stage.dangerCount}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
