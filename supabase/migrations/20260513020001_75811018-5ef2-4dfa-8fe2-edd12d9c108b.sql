
-- Allow patient self-insert into user_roles
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;
CREATE POLICY "Users can insert own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role IN ('volunteer'::app_role, 'doctor'::app_role, 'patient'::app_role));

-- Add patient_identifier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS patient_identifier text DEFAULT '';

-- Helper: is_patient
CREATE OR REPLACE FUNCTION public.is_patient()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'patient')
$$;

-- Helper: get current user's patient_identifier
CREATE OR REPLACE FUNCTION public.current_patient_identifier()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NULLIF(patient_identifier, '') FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Update health_screenings SELECT policy to also allow patients to see their own
DROP POLICY IF EXISTS "Submitters see own screenings" ON public.health_screenings;
CREATE POLICY "Submitters and patients see own screenings"
ON public.health_screenings
FOR SELECT
TO authenticated
USING (
  auth.uid() = submitted_by
  OR is_doctor()
  OR is_admin()
  OR (is_patient() AND patient_identifier IS NOT NULL AND patient_identifier <> '' AND patient_identifier = public.current_patient_identifier())
);

-- biomarker_profiles SELECT
DROP POLICY IF EXISTS "Users can view biomarkers for accessible screenings" ON public.biomarker_profiles;
CREATE POLICY "Users can view biomarkers for accessible screenings"
ON public.biomarker_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.health_screenings hs
    WHERE hs.id = biomarker_profiles.screening_id
      AND (
        hs.submitted_by = auth.uid()
        OR is_doctor()
        OR is_admin()
        OR (is_patient() AND hs.patient_identifier IS NOT NULL AND hs.patient_identifier <> '' AND hs.patient_identifier = public.current_patient_identifier())
      )
  )
);

-- disease_risk_assessments SELECT
DROP POLICY IF EXISTS "Users can view risk assessments for accessible screenings" ON public.disease_risk_assessments;
CREATE POLICY "Users can view risk assessments for accessible screenings"
ON public.disease_risk_assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.health_screenings hs
    WHERE hs.id = disease_risk_assessments.screening_id
      AND (
        hs.submitted_by = auth.uid()
        OR is_doctor()
        OR is_admin()
        OR (is_patient() AND hs.patient_identifier IS NOT NULL AND hs.patient_identifier <> '' AND hs.patient_identifier = public.current_patient_identifier())
      )
  )
);
