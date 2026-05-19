
CREATE TABLE public.calendar_tokens (
  user_id uuid PRIMARY KEY,
  household_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  default_meal_minutes integer NOT NULL DEFAULT 60,
  breakfast_time time NOT NULL DEFAULT '08:00',
  lunch_time time NOT NULL DEFAULT '13:00',
  dinner_time time NOT NULL DEFAULT '20:00',
  snack_time time NOT NULL DEFAULT '17:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz
);

CREATE INDEX idx_calendar_tokens_token ON public.calendar_tokens(token);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own token" ON public.calendar_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own token" ON public.calendar_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_household_member(household_id, auth.uid()));
CREATE POLICY "Users update own token" ON public.calendar_tokens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own token" ON public.calendar_tokens
  FOR DELETE USING (auth.uid() = user_id);
