CREATE TABLE public.calendly_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  event_uri TEXT NOT NULL,
  invitee_uri TEXT NOT NULL UNIQUE,
  reschedule_url TEXT,
  cancel_url TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  no_show_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendly_events_user_id ON public.calendly_events(user_id);
CREATE INDEX idx_calendly_events_invitee_email ON public.calendly_events(lower(invitee_email));
CREATE INDEX idx_calendly_events_status ON public.calendly_events(status);

ALTER TABLE public.calendly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own calendly events"
  ON public.calendly_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users update own calendly events"
  ON public.calendly_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_calendly_events_updated_at
  BEFORE UPDATE ON public.calendly_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill helper: when a profile is created, link any existing calendly events by email
CREATE OR REPLACE FUNCTION public.link_calendly_events_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.calendly_events
       SET user_id = NEW.user_id
     WHERE user_id IS NULL
       AND lower(invitee_email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER link_calendly_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_calendly_events_to_user();