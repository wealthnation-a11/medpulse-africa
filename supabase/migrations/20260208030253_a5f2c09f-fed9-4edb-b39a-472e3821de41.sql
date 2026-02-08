
-- ============================================
-- MedPulse Database Schema
-- ============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('volunteer', 'doctor', 'admin');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  default_location TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Observations table
CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  case_count INTEGER NOT NULL DEFAULT 1,
  temperature NUMERIC,
  rainfall NUMERIC,
  notes TEXT DEFAULT '',
  rule_risk_level TEXT NOT NULL DEFAULT 'Low',
  ai_risk_level TEXT,
  predicted_diseases TEXT[],
  confidence_scores NUMERIC[],
  outbreak_alert BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Doctor validations table
CREATE TABLE public.doctor_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES public.observations(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  corrected_disease TEXT,
  doctor_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Security definer helper functions
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'doctor'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_volunteer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'volunteer'
  )
$$;

-- ============================================
-- Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_observations_updated_at
BEFORE UPDATE ON public.observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_validations_updated_at
BEFORE UPDATE ON public.doctor_validations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS Policies
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own initial role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('volunteer', 'doctor')
);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- OBSERVATIONS
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers see own observations"
ON public.observations FOR SELECT
TO authenticated
USING (
  auth.uid() = volunteer_id
  OR public.is_doctor()
  OR public.is_admin()
);

CREATE POLICY "Volunteers can insert observations"
ON public.observations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = volunteer_id
  AND public.has_role(auth.uid(), 'volunteer')
);

CREATE POLICY "Volunteers can update own observations"
ON public.observations FOR UPDATE
TO authenticated
USING (
  (auth.uid() = volunteer_id AND public.has_role(auth.uid(), 'volunteer'))
  OR public.is_admin()
);

CREATE POLICY "Admins can delete observations"
ON public.observations FOR DELETE
TO authenticated
USING (public.is_admin());

-- DOCTOR_VALIDATIONS
ALTER TABLE public.doctor_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors and admins can view validations"
ON public.doctor_validations FOR SELECT
TO authenticated
USING (
  auth.uid() = doctor_id
  OR public.is_admin()
);

CREATE POLICY "Doctors can insert validations"
ON public.doctor_validations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id
  AND public.has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors can update own validations"
ON public.doctor_validations FOR UPDATE
TO authenticated
USING (
  (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'))
  OR public.is_admin()
);

CREATE POLICY "Admins can delete validations"
ON public.doctor_validations FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_observations_volunteer ON public.observations(volunteer_id);
CREATE INDEX idx_observations_risk ON public.observations(rule_risk_level);
CREATE INDEX idx_observations_status ON public.observations(status);
CREATE INDEX idx_observations_country ON public.observations(country);
CREATE INDEX idx_observations_created ON public.observations(created_at DESC);
CREATE INDEX idx_doctor_validations_observation ON public.doctor_validations(observation_id);
CREATE INDEX idx_doctor_validations_doctor ON public.doctor_validations(doctor_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
