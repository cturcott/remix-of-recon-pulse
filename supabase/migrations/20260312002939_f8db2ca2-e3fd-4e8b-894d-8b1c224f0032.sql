
-- Email provider settings (admin-configurable)
CREATE TABLE public.email_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'postmark',
  from_email text,
  from_name text DEFAULT 'Recon Pulse',
  message_stream text DEFAULT 'outbound',
  integration_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage email provider settings"
  ON public.email_provider_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER update_email_provider_settings_updated_at
  BEFORE UPDATE ON public.email_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a default row
INSERT INTO public.email_provider_settings (provider_name, from_name, integration_enabled)
VALUES ('postmark', 'Recon Pulse', false);
