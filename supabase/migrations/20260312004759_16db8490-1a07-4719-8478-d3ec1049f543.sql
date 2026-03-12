
-- Add import tracking fields to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS import_source_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS import_created boolean DEFAULT false;

-- Dealership import configuration
CREATE TABLE public.dealership_import_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  connection_type text NOT NULL DEFAULT 'ftp',
  ftp_host text,
  ftp_port integer DEFAULT 21,
  ftp_username text,
  ftp_password_ref text,
  remote_path text DEFAULT '/',
  file_name_pattern text,
  delimiter text NOT NULL DEFAULT ',',
  encoding text NOT NULL DEFAULT 'utf-8',
  has_header_row boolean NOT NULL DEFAULT true,
  import_frequency text NOT NULL DEFAULT 'manual',
  post_process_action text NOT NULL DEFAULT 'archive',
  default_starting_stage_id uuid REFERENCES public.workflow_stages(id),
  duplicate_handling_mode text NOT NULL DEFAULT 'skip',
  review_queue_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealership_id)
);

ALTER TABLE public.dealership_import_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all import configs"
  ON public.dealership_import_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Dealership admins can manage own import configs"
  ON public.dealership_import_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dealership_admin') AND is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can view import configs"
  ON public.dealership_import_configs FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

-- Dealership import mappings
CREATE TABLE public.dealership_import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  import_config_id uuid NOT NULL REFERENCES public.dealership_import_configs(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  mapping_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  transformation_rules_json jsonb DEFAULT '[]'::jsonb,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dealership_import_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all import mappings"
  ON public.dealership_import_mappings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Dealership admins can manage own import mappings"
  ON public.dealership_import_mappings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dealership_admin') AND is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can view import mappings"
  ON public.dealership_import_mappings FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

-- Import batches
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  import_config_id uuid REFERENCES public.dealership_import_configs(id),
  mapping_id uuid REFERENCES public.dealership_import_mappings(id),
  batch_status text NOT NULL DEFAULT 'pending',
  source_file_name text,
  source_file_path text,
  started_at timestamptz,
  completed_at timestamptz,
  total_rows integer DEFAULT 0,
  success_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  warning_rows integer DEFAULT 0,
  triggered_by uuid,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all import batches"
  ON public.import_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Dealership admins can manage own import batches"
  ON public.import_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dealership_admin') AND is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can view import batches"
  ON public.import_batches FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

-- Import batch rows
CREATE TABLE public.import_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_row_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped_row_json jsonb DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'pending',
  validation_errors_json jsonb DEFAULT '[]'::jsonb,
  vin_decode_status text DEFAULT 'pending',
  duplicate_status text DEFAULT 'none',
  created_vehicle_id uuid REFERENCES public.vehicles(id),
  review_status text DEFAULT 'none',
  final_outcome text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all import batch rows"
  ON public.import_batch_rows FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Dealership admins can manage own import batch rows"
  ON public.import_batch_rows FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dealership_admin') AND is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Assigned users can view import batch rows"
  ON public.import_batch_rows FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

-- Add FK for vehicles.import_batch_id
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_import_batch_id_fkey
  FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id);
