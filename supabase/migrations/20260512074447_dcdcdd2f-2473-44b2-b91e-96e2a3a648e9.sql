-- Extend notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Screening validations table
CREATE TABLE IF NOT EXISTS public.screening_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  validation_status text NOT NULL DEFAULT 'pending',
  corrected_risk_level text,
  doctor_notes text NOT NULL DEFAULT '',
  signed_off_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors and admins can view screening validations"
  ON public.screening_validations FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR is_doctor() OR is_admin());

CREATE POLICY "Doctors can insert screening validations"
  ON public.screening_validations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id AND (is_doctor() OR is_admin()));

CREATE POLICY "Doctors can update own screening validations"
  ON public.screening_validations FOR UPDATE TO authenticated
  USING ((auth.uid() = doctor_id AND is_doctor()) OR is_admin());

CREATE POLICY "Admins can delete screening validations"
  ON public.screening_validations FOR DELETE TO authenticated
  USING (is_admin());

CREATE TRIGGER update_screening_validations_updated_at
  BEFORE UPDATE ON public.screening_validations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_screening_validations_screening ON public.screening_validations(screening_id);
CREATE INDEX IF NOT EXISTS idx_screening_validations_doctor ON public.screening_validations(doctor_id);

-- High-risk notification trigger
CREATE OR REPLACE FUNCTION public.notify_doctors_on_high_risk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold int;
  patient_label text;
BEGIN
  SELECT high_risk_threshold INTO threshold FROM public.platform_settings LIMIT 1;
  IF threshold IS NULL THEN threshold := 60; END IF;

  IF NEW.risk_percentage < threshold THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(hs.patient_name, ''), NULLIF(hs.patient_identifier, ''), 'Anonymous patient')
    INTO patient_label
    FROM public.health_screenings hs WHERE hs.id = NEW.screening_id;

  INSERT INTO public.notifications (user_id, title, message, type, related_id, severity, category)
  SELECT ur.user_id,
         'High-risk screening flagged',
         patient_label || ' — ' || NEW.disease_name || ' risk ' || ROUND(NEW.risk_percentage) || '%',
         'warning',
         NEW.screening_id,
         'high',
         'screening'
  FROM public.user_roles ur
  WHERE ur.role = 'doctor';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctors_high_risk ON public.disease_risk_assessments;
CREATE TRIGGER trg_notify_doctors_high_risk
  AFTER INSERT ON public.disease_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.notify_doctors_on_high_risk();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.screening_validations;