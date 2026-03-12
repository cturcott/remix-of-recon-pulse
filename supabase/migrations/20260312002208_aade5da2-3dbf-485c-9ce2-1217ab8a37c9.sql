
-- Repair/work line items per vehicle
CREATE TABLE public.repair_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.workflow_stages(id),
  description text NOT NULL,
  category text DEFAULT 'general',
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  vendor_name text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  denied_by uuid,
  denied_at timestamptz,
  denial_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;

-- Platform admins full access
CREATE POLICY "Platform admins can manage all repair items"
  ON public.repair_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Assigned users can view
CREATE POLICY "Assigned users can view repair items"
  ON public.repair_items FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Assigned users can insert
CREATE POLICY "Assigned users can insert repair items"
  ON public.repair_items FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Assigned users can update
CREATE POLICY "Assigned users can update repair items"
  ON public.repair_items FOR UPDATE TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Assigned users can delete their own pending items
CREATE POLICY "Users can delete own pending repair items"
  ON public.repair_items FOR DELETE TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id) AND status = 'pending');

-- Updated_at trigger
CREATE TRIGGER update_repair_items_updated_at
  BEFORE UPDATE ON public.repair_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
