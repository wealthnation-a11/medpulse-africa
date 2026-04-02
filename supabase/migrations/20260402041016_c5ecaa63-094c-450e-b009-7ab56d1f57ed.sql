DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Doctors and admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (is_doctor() OR is_admin());