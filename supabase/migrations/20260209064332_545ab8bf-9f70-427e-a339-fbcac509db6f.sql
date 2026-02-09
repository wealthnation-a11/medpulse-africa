-- Drop the existing volunteer-only insert policy
DROP POLICY "Volunteers can insert observations" ON public.observations;

-- Create a new policy allowing both volunteers and doctors to insert observations
CREATE POLICY "Volunteers and doctors can insert observations"
ON public.observations
FOR INSERT
WITH CHECK (
  (auth.uid() = volunteer_id)
  AND (
    has_role(auth.uid(), 'volunteer'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
  )
);