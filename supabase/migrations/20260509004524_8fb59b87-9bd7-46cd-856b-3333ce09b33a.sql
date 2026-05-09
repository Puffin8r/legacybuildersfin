-- Notifications shown in-app
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  link TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- No-show analytics log (backend only)
CREATE TABLE public.no_show_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  invitee_email TEXT,
  invitee_name TEXT,
  scheduled_start TIMESTAMPTZ,
  event_uri TEXT,
  source TEXT NOT NULL DEFAULT 'n8n',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_no_show_logs_email ON public.no_show_logs(lower(invitee_email));
CREATE INDEX idx_no_show_logs_created ON public.no_show_logs(created_at DESC);

ALTER TABLE public.no_show_logs ENABLE ROW LEVEL SECURITY;
-- No policies => only service role (backend) can read/write.