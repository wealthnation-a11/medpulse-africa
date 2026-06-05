
-- AI feedback examples (server-curated few-shot calibration data)
CREATE TABLE public.ai_feedback_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid NOT NULL,
  disease_name text NOT NULL,
  ai_risk_percentage numeric NOT NULL,
  corrected_risk_level text NOT NULL,
  doctor_notes text DEFAULT '',
  patient_age integer,
  patient_sex text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_feedback_examples TO authenticated;
GRANT ALL ON public.ai_feedback_examples TO service_role;

ALTER TABLE public.ai_feedback_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI feedback examples"
  ON public.ai_feedback_examples FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX idx_ai_feedback_examples_cohort ON public.ai_feedback_examples (patient_sex, patient_age, created_at DESC);

-- Extend disease_risk_assessments
ALTER TABLE public.disease_risk_assessments
  ADD COLUMN IF NOT EXISTS rationale text DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rule_based_level text,
  ADD COLUMN IF NOT EXISTS disagreement boolean NOT NULL DEFAULT false;

-- Extend health_screenings with imaging regions
ALTER TABLE public.health_screenings
  ADD COLUMN IF NOT EXISTS imaging_regions jsonb DEFAULT '[]'::jsonb;

-- Trigger: when a doctor signs off and provides a corrected risk, record per-disease calibration examples
CREATE OR REPLACE FUNCTION public.record_ai_feedback_example()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age int;
  v_sex text;
BEGIN
  IF NEW.signed_off_at IS NULL OR NEW.corrected_risk_level IS NULL OR NEW.corrected_risk_level = '' THEN
    RETURN NEW;
  END IF;

  SELECT patient_age, patient_sex INTO v_age, v_sex
    FROM public.health_screenings WHERE id = NEW.screening_id;

  INSERT INTO public.ai_feedback_examples
    (screening_id, disease_name, ai_risk_percentage, corrected_risk_level, doctor_notes, patient_age, patient_sex)
  SELECT NEW.screening_id, dra.disease_name, dra.risk_percentage, NEW.corrected_risk_level, COALESCE(NEW.doctor_notes,''), v_age, v_sex
    FROM public.disease_risk_assessments dra
   WHERE dra.screening_id = NEW.screening_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_ai_feedback_example ON public.screening_validations;
CREATE TRIGGER trg_record_ai_feedback_example
  AFTER INSERT OR UPDATE ON public.screening_validations
  FOR EACH ROW EXECUTE FUNCTION public.record_ai_feedback_example();

-- Trigger: notify doctors when AI and rule-based disagree
CREATE OR REPLACE FUNCTION public.notify_doctors_on_ai_disagreement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_label text;
BEGIN
  IF NEW.disagreement IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(hs.patient_name,''), NULLIF(hs.patient_identifier,''), 'Anonymous patient')
    INTO patient_label
    FROM public.health_screenings hs WHERE hs.id = NEW.screening_id;

  INSERT INTO public.notifications (user_id, title, message, type, related_id, severity, category)
  SELECT ur.user_id,
         'AI vs rule-based disagreement',
         patient_label || ' — ' || NEW.disease_name || ': AI ' || ROUND(NEW.risk_percentage) || '% vs rule-based ' || COALESCE(NEW.rule_based_level,'n/a'),
         'warning',
         NEW.screening_id,
         'medium',
         'ai_disagreement'
    FROM public.user_roles ur
   WHERE ur.role = 'doctor';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctors_on_ai_disagreement ON public.disease_risk_assessments;
CREATE TRIGGER trg_notify_doctors_on_ai_disagreement
  AFTER INSERT ON public.disease_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.notify_doctors_on_ai_disagreement();
