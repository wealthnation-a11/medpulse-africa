
ALTER TABLE public.health_screenings
  ADD COLUMN IF NOT EXISTS patient_identifier text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS patient_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS imaging_findings text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_health_screenings_patient_identifier
  ON public.health_screenings (patient_identifier)
  WHERE patient_identifier <> '';
