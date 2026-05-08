ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS expiry_warning_days integer NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_meal_plans_household_week ON public.meal_plans(household_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_plan_day ON public.meal_plan_entries(meal_plan_id, day_date);