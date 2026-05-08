-- Notification preferences (per household)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  expiry_alerts BOOLEAN NOT NULL DEFAULT true,
  shopping_reminders BOOLEAN NOT NULL DEFAULT true,
  weekly_plan_reminders BOOLEAN NOT NULL DEFAULT true,
  daily_send_hour INTEGER NOT NULL DEFAULT 9,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view notif prefs" ON public.notification_preferences
  FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members upsert notif prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update notif prefs" ON public.notification_preferences
  FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));

-- Push subscriptions (per user)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subs select" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subs insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own subs delete" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- RPC to accept invite via code
CREATE OR REPLACE FUNCTION public.accept_household_invite(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO inv FROM public.household_invites
    WHERE code = _code AND used_at IS NULL AND expires_at > now()
    LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_or_expired'; END IF;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (inv.household_id, uid, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.household_invites SET used_at = now() WHERE id = inv.id;

  UPDATE public.profiles SET current_household_id = inv.household_id WHERE id = uid;

  RETURN inv.household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_household_invite(TEXT) TO authenticated;
