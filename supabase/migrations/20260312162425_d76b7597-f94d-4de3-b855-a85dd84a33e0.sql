
-- Add assigned_to column to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL;

-- Create vehicle_notes table for activity feed / notes
CREATE TABLE public.vehicle_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  author_id uuid DEFAULT NULL,
  note_type text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Assigned users can view vehicle notes"
  ON public.vehicle_notes FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can insert vehicle notes"
  ON public.vehicle_notes FOR INSERT TO authenticated
  WITH CHECK (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Platform admins can manage all vehicle notes"
  ON public.vehicle_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_vehicle_notes_vehicle_id ON public.vehicle_notes(vehicle_id);
CREATE INDEX idx_vehicle_notes_dealership_id ON public.vehicle_notes(dealership_id);
