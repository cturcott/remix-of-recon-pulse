
CREATE TABLE public.workflow_stage_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_stage_id, user_id)
);

ALTER TABLE public.workflow_stage_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigned users can view stage assignees"
  ON public.workflow_stage_assignees FOR SELECT TO authenticated
  USING (is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Dealership admins can manage own stage assignees"
  ON public.workflow_stage_assignees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'dealership_admin') AND is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "Platform admins can manage all stage assignees"
  ON public.workflow_stage_assignees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));
