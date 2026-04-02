-- Platform settings table (single row config)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  high_risk_threshold integer NOT NULL DEFAULT 10,
  medium_risk_threshold integer NOT NULL DEFAULT 5,
  outbreak_alert_threshold integer NOT NULL DEFAULT 20,
  notify_doctors_high_risk boolean NOT NULL DEFAULT true,
  notify_doctors_outbreak boolean NOT NULL DEFAULT true,
  notify_admins_new_users boolean NOT NULL DEFAULT true,
  auto_flag_high_risk boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.platform_settings (id) VALUES (gen_random_uuid());

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can update settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Updated at trigger for settings
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();