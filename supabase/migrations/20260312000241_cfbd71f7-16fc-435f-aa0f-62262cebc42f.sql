
-- Workflow stages table
CREATE TABLE public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage_key text, -- system-level type for reporting (e.g., 'intake', 'mpi', 'flr')
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  is_start_stage boolean NOT NULL DEFAULT false,
  is_completion_stage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all
CREATE POLICY "Platform admins can manage all workflow stages"
  ON public.workflow_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Dealership admins can manage their own
CREATE POLICY "Dealership admins can manage own workflow stages"
  ON public.workflow_stages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'dealership_admin') 
    AND public.is_assigned_to_dealership(auth.uid(), dealership_id)
  );

-- Assigned users can view
CREATE POLICY "Assigned users can view workflow stages"
  ON public.workflow_stages FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Vehicles table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vin text NOT NULL,
  year integer,
  make text,
  model text,
  trim text,
  body_style text,
  engine text,
  drivetrain text,
  fuel_type text,
  exterior_color text,
  interior_color text,
  mileage integer NOT NULL,
  stock_number text,
  acquisition_source text,
  acv numeric(12,2),
  lot_location text,
  notes text,
  status text NOT NULL DEFAULT 'in_recon',
  current_stage_id uuid REFERENCES public.workflow_stages(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealership_id, vin)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all vehicles"
  ON public.vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Assigned users can view dealership vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can insert vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can update vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Vehicle stage history
CREATE TABLE public.vehicle_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.workflow_stages(id),
  to_stage_id uuid NOT NULL REFERENCES public.workflow_stages(id),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  reason_code text
);

ALTER TABLE public.vehicle_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all stage history"
  ON public.vehicle_stage_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Assigned users can view stage history"
  ON public.vehicle_stage_history FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can insert stage history"
  ON public.vehicle_stage_history FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Vehicle photos
CREATE TABLE public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  photo_type text DEFAULT 'intake',
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all photos"
  ON public.vehicle_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Assigned users can view photos"
  ON public.vehicle_photos FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can insert photos"
  ON public.vehicle_photos FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- VIN decode logs
CREATE TABLE public.vin_decode_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vin text NOT NULL,
  decode_status text NOT NULL DEFAULT 'pending',
  decode_payload jsonb,
  decoded_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.vin_decode_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert decode logs"
  ON public.vin_decode_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view own decode logs"
  ON public.vin_decode_logs FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));

-- Function to seed default workflow stages for a new dealership
CREATE OR REPLACE FUNCTION public.seed_default_workflow_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.workflow_stages (dealership_id, name, stage_key, sort_order, is_active, is_required, is_start_stage, is_completion_stage)
  VALUES
    (NEW.id, 'Intake & Check-In',          'intake',         1,  true, true,  true,  false),
    (NEW.id, 'Multi-Point Inspection',     'mpi',            2,  true, true,  false, false),
    (NEW.id, 'Service Approvals',          'approvals',      3,  true, true,  false, false),
    (NEW.id, 'Mechanical Repair',          'mechanical',     4,  true, false, false, false),
    (NEW.id, 'Cosmetic & Sublet Work',     'cosmetic',       5,  true, false, false, false),
    (NEW.id, 'Professional Detail',        'detail',         6,  true, false, false, false),
    (NEW.id, 'Photography & Merchandising','merchandising',  7,  true, false, false, false),
    (NEW.id, 'Final QC & Front-Line Ready','flr',            8,  true, true,  false, true);
  RETURN NEW;
END;
$$;

-- Trigger to auto-seed workflow on dealership creation
CREATE TRIGGER seed_workflow_on_dealership_insert
  AFTER INSERT ON public.dealerships
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_workflow_stages();

-- Updated_at triggers
CREATE TRIGGER update_workflow_stages_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for vehicles
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
