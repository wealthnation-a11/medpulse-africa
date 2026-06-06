
-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Add columns to health_screenings
ALTER TABLE public.health_screenings
  ADD COLUMN IF NOT EXISTS patient_dob date,
  ADD COLUMN IF NOT EXISTS patient_name_normalized text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'clinical';

CREATE INDEX IF NOT EXISTS idx_health_screenings_patient_identifier ON public.health_screenings(patient_identifier);
CREATE INDEX IF NOT EXISTS idx_health_screenings_source ON public.health_screenings(source);

-- Validation trigger for source (avoid CHECK on time/data-dependent rules per project conventions)
CREATE OR REPLACE FUNCTION public.validate_health_screening_source()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source NOT IN ('clinical','self_reported','device_import','fhir') THEN
    RAISE EXCEPTION 'Invalid source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_hs_source ON public.health_screenings;
CREATE TRIGGER trg_validate_hs_source
BEFORE INSERT OR UPDATE ON public.health_screenings
FOR EACH ROW EXECUTE FUNCTION public.validate_health_screening_source();

-- 3) Patient directory
CREATE TABLE IF NOT EXISTS public.patient_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_identifier text NOT NULL UNIQUE,
  display_name text NOT NULL,
  display_name_normalized text NOT NULL,
  dob date,
  sex text,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.patient_directory TO authenticated;
GRANT ALL ON public.patient_directory TO service_role;

ALTER TABLE public.patient_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors/admins/volunteers can read patient directory"
  ON public.patient_directory FOR SELECT TO authenticated
  USING (is_doctor() OR is_admin() OR is_volunteer());

CREATE POLICY "Doctors/admins/volunteers can insert patient directory"
  ON public.patient_directory FOR INSERT TO authenticated
  WITH CHECK (is_doctor() OR is_admin() OR is_volunteer());

CREATE POLICY "Doctors/admins can update patient directory"
  ON public.patient_directory FOR UPDATE TO authenticated
  USING (is_doctor() OR is_admin());

CREATE INDEX IF NOT EXISTS idx_patient_directory_dob ON public.patient_directory(dob);
CREATE INDEX IF NOT EXISTS idx_patient_directory_name_trgm ON public.patient_directory USING gin(display_name_normalized gin_trgm_ops);

CREATE TRIGGER trg_patient_directory_updated_at
BEFORE UPDATE ON public.patient_directory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helpers
CREATE OR REPLACE FUNCTION public.normalize_patient_name(in_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(regexp_replace(lower(coalesce(in_name,'')), '[^a-z0-9]+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'PT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
$$;

CREATE OR REPLACE FUNCTION public.match_or_create_patient(in_name text, in_dob date, in_sex text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_norm text;
  v_match record;
  v_new_id text;
BEGIN
  v_norm := public.normalize_patient_name(in_name);
  IF v_norm = '' THEN
    v_new_id := public.generate_patient_id();
    INSERT INTO public.patient_directory(canonical_identifier, display_name, display_name_normalized, dob, sex)
    VALUES (v_new_id, coalesce(in_name,'Unknown'), v_norm, in_dob, in_sex);
    RETURN v_new_id;
  END IF;

  IF in_dob IS NOT NULL THEN
    SELECT * INTO v_match FROM public.patient_directory
     WHERE dob = in_dob
       AND similarity(display_name_normalized, v_norm) >= 0.6
     ORDER BY similarity(display_name_normalized, v_norm) DESC, updated_at DESC
     LIMIT 1;
  ELSE
    SELECT * INTO v_match FROM public.patient_directory
     WHERE similarity(display_name_normalized, v_norm) >= 0.8
     ORDER BY similarity(display_name_normalized, v_norm) DESC, updated_at DESC
     LIMIT 1;
  END IF;

  IF FOUND THEN
    IF v_match.display_name_normalized <> v_norm THEN
      UPDATE public.patient_directory
         SET aliases = aliases || jsonb_build_object('name', in_name, 'dob', in_dob, 'added_at', now()),
             updated_at = now()
       WHERE id = v_match.id;
    END IF;
    RETURN v_match.canonical_identifier;
  END IF;

  v_new_id := public.generate_patient_id();
  INSERT INTO public.patient_directory(canonical_identifier, display_name, display_name_normalized, dob, sex)
  VALUES (v_new_id, coalesce(in_name,'Unknown'), v_norm, in_dob, in_sex);
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_patient_match(in_name text, in_dob date)
RETURNS TABLE(canonical_identifier text, display_name text, dob date, prior_screenings bigint, similarity_score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH norm AS (SELECT public.normalize_patient_name(in_name) AS n)
  SELECT pd.canonical_identifier, pd.display_name, pd.dob,
         (SELECT count(*) FROM public.health_screenings hs WHERE hs.patient_identifier = pd.canonical_identifier),
         similarity(pd.display_name_normalized, (SELECT n FROM norm))::real
  FROM public.patient_directory pd
  WHERE (in_dob IS NULL OR pd.dob = in_dob)
    AND similarity(pd.display_name_normalized, (SELECT n FROM norm)) >= 0.5
  ORDER BY similarity(pd.display_name_normalized, (SELECT n FROM norm)) DESC
  LIMIT 5;
$$;

-- before-insert trigger to resolve patient_identifier and set normalized name
CREATE OR REPLACE FUNCTION public.resolve_patient_on_screening()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.patient_name_normalized := public.normalize_patient_name(NEW.patient_name);
  IF (NEW.patient_identifier IS NULL OR NEW.patient_identifier = '') AND coalesce(NEW.patient_name,'') <> '' THEN
    NEW.patient_identifier := public.match_or_create_patient(NEW.patient_name, NEW.patient_dob, NEW.patient_sex);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_patient ON public.health_screenings;
CREATE TRIGGER trg_resolve_patient
BEFORE INSERT ON public.health_screenings
FOR EACH ROW EXECUTE FUNCTION public.resolve_patient_on_screening();

-- 4) screening_follow_ups
CREATE TABLE IF NOT EXISTS public.screening_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_identifier text NOT NULL,
  screening_id uuid,
  biomarker_name text NOT NULL,
  projected_value numeric,
  threshold_value numeric,
  due_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  assigned_doctor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.screening_follow_ups TO authenticated;
GRANT ALL ON public.screening_follow_ups TO service_role;

ALTER TABLE public.screening_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors/admins can read follow-ups" ON public.screening_follow_ups
  FOR SELECT TO authenticated USING (is_doctor() OR is_admin() OR (is_patient() AND patient_identifier = current_patient_identifier()));
CREATE POLICY "Doctors/admins can insert follow-ups" ON public.screening_follow_ups
  FOR INSERT TO authenticated WITH CHECK (is_doctor() OR is_admin());
CREATE POLICY "Doctors/admins can update follow-ups" ON public.screening_follow_ups
  FOR UPDATE TO authenticated USING (is_doctor() OR is_admin());

CREATE INDEX IF NOT EXISTS idx_follow_ups_due_status ON public.screening_follow_ups(due_at, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON public.screening_follow_ups(patient_identifier);

CREATE TRIGGER trg_follow_ups_updated_at
BEFORE UPDATE ON public.screening_follow_ups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) FHIR ingest tables
CREATE TABLE IF NOT EXISTS public.fhir_ingest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  source_system text NOT NULL DEFAULT '',
  bundle_id text,
  resource_count int NOT NULL DEFAULT 0,
  created_count int NOT NULL DEFAULT 0,
  skipped jsonb NOT NULL DEFAULT '[]'::jsonb,
  error jsonb,
  payload_size int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.fhir_ingest_logs TO authenticated;
GRANT ALL ON public.fhir_ingest_logs TO service_role;

ALTER TABLE public.fhir_ingest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read fhir logs" ON public.fhir_ingest_logs
  FOR SELECT TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.fhir_ingest_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.fhir_ingest_tokens TO authenticated;
GRANT ALL ON public.fhir_ingest_tokens TO service_role;

ALTER TABLE public.fhir_ingest_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fhir tokens" ON public.fhir_ingest_tokens
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 6) RLS additions on health_screenings to allow self-reported inserts
DROP POLICY IF EXISTS "Volunteers and doctors can insert screenings" ON public.health_screenings;
CREATE POLICY "Volunteers, doctors and patients can insert screenings"
  ON public.health_screenings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by AND (
      has_role(auth.uid(),'volunteer'::app_role)
      OR has_role(auth.uid(),'doctor'::app_role)
      OR (has_role(auth.uid(),'patient'::app_role)
          AND source = 'self_reported'
          AND patient_identifier IS NOT NULL
          AND patient_identifier <> ''
          AND patient_identifier = current_patient_identifier())
    )
  );

-- 7) Backfill patient_name_normalized for existing rows
UPDATE public.health_screenings
   SET patient_name_normalized = public.normalize_patient_name(patient_name)
 WHERE patient_name_normalized IS NULL;
