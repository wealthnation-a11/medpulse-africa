
-- Create health_screenings table
CREATE TABLE public.health_screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID NOT NULL,
  patient_age INTEGER NOT NULL,
  patient_sex TEXT NOT NULL DEFAULT 'unknown',
  family_history JSONB DEFAULT '[]'::jsonb,
  screening_type TEXT NOT NULL DEFAULT 'blood_test',
  test_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  clinical_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  ai_analysis_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters see own screenings" ON public.health_screenings
  FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by OR is_doctor() OR is_admin());

CREATE POLICY "Volunteers and doctors can insert screenings" ON public.health_screenings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by AND (has_role(auth.uid(), 'volunteer') OR has_role(auth.uid(), 'doctor')));

CREATE POLICY "Doctors and admins can update screenings" ON public.health_screenings
  FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by OR is_doctor() OR is_admin());

CREATE POLICY "Admins can delete screenings" ON public.health_screenings
  FOR DELETE TO authenticated
  USING (is_admin());

CREATE TRIGGER update_health_screenings_updated_at
  BEFORE UPDATE ON public.health_screenings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create biomarker_profiles table
CREATE TABLE public.biomarker_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id UUID NOT NULL REFERENCES public.health_screenings(id) ON DELETE CASCADE,
  biomarker_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  reference_range_low NUMERIC,
  reference_range_high NUMERIC,
  is_abnormal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.biomarker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view biomarkers for accessible screenings" ON public.biomarker_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.health_screenings hs WHERE hs.id = screening_id AND (hs.submitted_by = auth.uid() OR is_doctor() OR is_admin())));

CREATE POLICY "Doctors and admins can insert biomarkers" ON public.biomarker_profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_doctor() OR is_admin() OR EXISTS (SELECT 1 FROM public.health_screenings hs WHERE hs.id = screening_id AND hs.submitted_by = auth.uid()));

CREATE POLICY "Admins can delete biomarkers" ON public.biomarker_profiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- Create disease_risk_assessments table
CREATE TABLE public.disease_risk_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id UUID NOT NULL REFERENCES public.health_screenings(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  risk_percentage NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  time_horizon TEXT DEFAULT '',
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.disease_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk assessments for accessible screenings" ON public.disease_risk_assessments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.health_screenings hs WHERE hs.id = screening_id AND (hs.submitted_by = auth.uid() OR is_doctor() OR is_admin())));

CREATE POLICY "System can insert risk assessments" ON public.disease_risk_assessments
  FOR INSERT TO authenticated
  WITH CHECK (is_doctor() OR is_admin() OR EXISTS (SELECT 1 FROM public.health_screenings hs WHERE hs.id = screening_id AND hs.submitted_by = auth.uid()));

CREATE POLICY "Admins can delete risk assessments" ON public.disease_risk_assessments
  FOR DELETE TO authenticated
  USING (is_admin());

-- Enable realtime for health_screenings
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_screenings;
