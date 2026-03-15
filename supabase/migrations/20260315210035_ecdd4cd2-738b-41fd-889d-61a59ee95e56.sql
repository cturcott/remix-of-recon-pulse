CREATE TABLE public.saved_report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dealership_id uuid REFERENCES public.dealerships(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  name text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved views"
  ON public.saved_report_views
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins can manage all saved views"
  ON public.saved_report_views
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));
