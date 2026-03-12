
-- Fix overly permissive policy on vin_decode_logs
DROP POLICY "Authenticated users can insert decode logs" ON public.vin_decode_logs;
CREATE POLICY "Authenticated users can insert own decode logs"
  ON public.vin_decode_logs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
