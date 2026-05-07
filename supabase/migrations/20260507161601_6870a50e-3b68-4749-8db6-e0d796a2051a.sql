ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS monthly_budget numeric;