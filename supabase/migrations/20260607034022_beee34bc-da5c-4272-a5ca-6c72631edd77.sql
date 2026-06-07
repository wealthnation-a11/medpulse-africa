
-- 1) user_roles: only volunteer or patient can be self-assigned at signup.
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;
CREATE POLICY "Users can insert own initial role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = ANY (ARRAY['volunteer'::app_role, 'patient'::app_role])
  );

-- 2) Storage: scope medical-images SELECT and INSERT to the user's own folder.
DROP POLICY IF EXISTS "Users can view medical images" ON storage.objects;
CREATE POLICY "Users can view own medical images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-images'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_doctor()
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can upload medical images" ON storage.objects;
CREATE POLICY "Users can upload own medical images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3) observations INSERT policy: restrict to authenticated (not public).
DROP POLICY IF EXISTS "Volunteers and doctors can insert observations" ON public.observations;
CREATE POLICY "Volunteers and doctors can insert observations"
  ON public.observations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = volunteer_id
    AND (
      public.has_role(auth.uid(), 'volunteer'::app_role)
      OR public.has_role(auth.uid(), 'doctor'::app_role)
    )
  );

-- 4) Notifications: remove the patient->doctor INSERT policy. Screening
--    requests should be created server-side via an edge function so the
--    sender identity is enforced and the recipient cannot be spoofed.
DROP POLICY IF EXISTS "Patients can request screenings" ON public.notifications;

-- 5) Lock down SECURITY DEFINER helpers: only authenticated may execute.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_doctor() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_volunteer() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_patient() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_patient_identifier() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_or_create_patient(text, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.preview_patient_match(text, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_patient_id() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_doctor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_volunteer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_patient() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_patient_identifier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_or_create_patient(text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_patient_match(text, date) TO authenticated;
