
-- Stage notification rules per dealership per stage
CREATE TABLE public.stage_notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  workflow_stage_id uuid NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  notifications_enabled boolean NOT NULL DEFAULT false,
  template_key_stage_entry text DEFAULT 'vehicle-entered-stage',
  template_key_reminder text DEFAULT 'stage-reminder',
  template_key_escalation text DEFAULT 'stage-escalation',
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_after_minutes integer DEFAULT 120,
  escalation_enabled boolean NOT NULL DEFAULT false,
  escalation_after_minutes integer DEFAULT 360,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealership_id, workflow_stage_id)
);

ALTER TABLE public.stage_notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all notification rules"
  ON public.stage_notification_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Dealership admins can manage own notification rules"
  ON public.stage_notification_rules FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'dealership_admin')
    AND public.is_assigned_to_dealership(auth.uid(), dealership_id)
  );

CREATE POLICY "Assigned users can view notification rules"
  ON public.stage_notification_rules FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Recipients per notification rule
CREATE TABLE public.stage_notification_rule_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_notification_rule_id uuid NOT NULL REFERENCES public.stage_notification_rules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipient_type text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_notification_rule_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all rule recipients"
  ON public.stage_notification_rule_recipients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stage_notification_rules r
      WHERE r.id = stage_notification_rule_id
      AND public.has_role(auth.uid(), 'platform_admin')
    )
  );

CREATE POLICY "Dealership admins can manage own rule recipients"
  ON public.stage_notification_rule_recipients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stage_notification_rules r
      WHERE r.id = stage_notification_rule_id
      AND public.has_role(auth.uid(), 'dealership_admin')
      AND public.is_assigned_to_dealership(auth.uid(), r.dealership_id)
    )
  );

CREATE POLICY "Assigned users can view rule recipients"
  ON public.stage_notification_rule_recipients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stage_notification_rules r
      WHERE r.id = stage_notification_rule_id
      AND public.is_assigned_to_dealership(auth.uid(), r.dealership_id)
    )
  );

-- Notification events log
CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  workflow_stage_id uuid REFERENCES public.workflow_stages(id),
  event_type text NOT NULL DEFAULT 'stage_entry',
  triggered_by_user_id uuid,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  provider text DEFAULT 'postmark',
  provider_message_id text,
  template_key text,
  tag text,
  metadata_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all notification events"
  ON public.notification_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Assigned users can view notification events"
  ON public.notification_events FOR SELECT TO authenticated
  USING (public.is_assigned_to_dealership(auth.uid(), dealership_id));

CREATE POLICY "System can insert notification events"
  ON public.notification_events FOR INSERT TO authenticated
  WITH CHECK (public.is_assigned_to_dealership(auth.uid(), dealership_id));

-- Notification event recipients
CREATE TABLE public.notification_event_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_event_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  user_id uuid,
  recipient_email text NOT NULL,
  recipient_name text,
  delivery_status text NOT NULL DEFAULT 'pending',
  bounce_type text,
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_event_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all event recipients"
  ON public.notification_event_recipients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notification_events ne
      WHERE ne.id = notification_event_id
      AND public.has_role(auth.uid(), 'platform_admin')
    )
  );

CREATE POLICY "Assigned users can view event recipients"
  ON public.notification_event_recipients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notification_events ne
      WHERE ne.id = notification_event_id
      AND public.is_assigned_to_dealership(auth.uid(), ne.dealership_id)
    )
  );

CREATE POLICY "System can insert event recipients"
  ON public.notification_event_recipients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notification_events ne
      WHERE ne.id = notification_event_id
      AND public.is_assigned_to_dealership(auth.uid(), ne.dealership_id)
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_stage_notification_rules_updated_at
  BEFORE UPDATE ON public.stage_notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_event_recipients_updated_at
  BEFORE UPDATE ON public.notification_event_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
