-- Allow patients to insert screening_request notifications targeted at doctors
CREATE POLICY "Patients can request screenings"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_patient()
  AND category = 'screening_request'
  AND has_role(notifications.user_id, 'doctor'::app_role)
);

-- Trigger function: notify patient when their screening is signed off
CREATE OR REPLACE FUNCTION public.notify_patient_on_signoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_identifier text;
  v_patient_name text;
  v_patient_user_id uuid;
  v_severity text;
  v_msg text;
BEGIN
  IF NEW.signed_off_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT patient_identifier, patient_name
    INTO v_patient_identifier, v_patient_name
    FROM public.health_screenings WHERE id = NEW.screening_id;

  IF v_patient_identifier IS NULL OR v_patient_identifier = '' THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_patient_user_id
    FROM public.profiles
    WHERE patient_identifier = v_patient_identifier
    LIMIT 1;

  IF v_patient_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_severity := CASE
    WHEN NEW.corrected_risk_level = 'High' THEN 'high'
    WHEN NEW.corrected_risk_level = 'Medium' THEN 'medium'
    ELSE 'low'
  END;

  v_msg := 'A clinician reviewed your screening — decision: ' || NEW.validation_status
    || COALESCE(' (revised risk: ' || NEW.corrected_risk_level || ')', '');

  INSERT INTO public.notifications (user_id, title, message, type, related_id, severity, category)
  VALUES (
    v_patient_user_id,
    'Your screening was reviewed',
    v_msg,
    CASE WHEN v_severity = 'high' THEN 'warning' ELSE 'info' END,
    NEW.screening_id,
    v_severity,
    'signoff'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_signoff ON public.screening_validations;
CREATE TRIGGER trg_notify_patient_on_signoff
AFTER INSERT OR UPDATE ON public.screening_validations
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_signoff();