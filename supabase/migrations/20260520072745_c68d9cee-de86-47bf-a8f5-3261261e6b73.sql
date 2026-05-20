
-- 1. member_kind enum + column
DO $$ BEGIN
  CREATE TYPE public.member_kind AS ENUM ('adult','child');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS member_kind public.member_kind NOT NULL DEFAULT 'adult';

-- 2. helper: is current user an adult in this household?
CREATE OR REPLACE FUNCTION public.is_household_adult(_household_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id
      AND user_id = _user_id
      AND member_kind = 'adult'
  );
$$;

-- 3. Restrict writes to adults on key tables
-- food_items
DROP POLICY IF EXISTS "Members add food" ON public.food_items;
DROP POLICY IF EXISTS "Members update food" ON public.food_items;
DROP POLICY IF EXISTS "Members delete food" ON public.food_items;
CREATE POLICY "Adults add food" ON public.food_items
  FOR INSERT WITH CHECK (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults update food" ON public.food_items
  FOR UPDATE USING (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults delete food" ON public.food_items
  FOR DELETE USING (public.is_household_adult(household_id, auth.uid()));

-- shopping_list_items
DROP POLICY IF EXISTS "Members add shopping" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Members update shopping" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Members delete shopping" ON public.shopping_list_items;
CREATE POLICY "Adults add shopping" ON public.shopping_list_items
  FOR INSERT WITH CHECK (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults update shopping" ON public.shopping_list_items
  FOR UPDATE USING (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults delete shopping" ON public.shopping_list_items
  FOR DELETE USING (public.is_household_adult(household_id, auth.uid()));

-- meal_plans
DROP POLICY IF EXISTS "Members add plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Members update plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Members delete plans" ON public.meal_plans;
CREATE POLICY "Adults add plans" ON public.meal_plans
  FOR INSERT WITH CHECK (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults update plans" ON public.meal_plans
  FOR UPDATE USING (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults delete plans" ON public.meal_plans
  FOR DELETE USING (public.is_household_adult(household_id, auth.uid()));

-- meal_plan_entries (via meal_plans household)
DROP POLICY IF EXISTS "Add plan entries" ON public.meal_plan_entries;
DROP POLICY IF EXISTS "Update plan entries" ON public.meal_plan_entries;
DROP POLICY IF EXISTS "Delete plan entries" ON public.meal_plan_entries;
CREATE POLICY "Adults add plan entries" ON public.meal_plan_entries
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans p
    WHERE p.id = meal_plan_entries.meal_plan_id
      AND public.is_household_adult(p.household_id, auth.uid())
  ));
CREATE POLICY "Adults update plan entries" ON public.meal_plan_entries
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.meal_plans p
    WHERE p.id = meal_plan_entries.meal_plan_id
      AND public.is_household_adult(p.household_id, auth.uid())
  ));
CREATE POLICY "Adults delete plan entries" ON public.meal_plan_entries
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.meal_plans p
    WHERE p.id = meal_plan_entries.meal_plan_id
      AND public.is_household_adult(p.household_id, auth.uid())
  ));

-- recipes
DROP POLICY IF EXISTS "Members add recipes" ON public.recipes;
DROP POLICY IF EXISTS "Members update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Members delete own recipes" ON public.recipes;
CREATE POLICY "Adults add recipes" ON public.recipes
  FOR INSERT WITH CHECK (household_id IS NOT NULL AND public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults update own recipes" ON public.recipes
  FOR UPDATE USING (household_id IS NOT NULL AND public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults delete own recipes" ON public.recipes
  FOR DELETE USING (household_id IS NOT NULL AND public.is_household_adult(household_id, auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Members add expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members delete expenses" ON public.expenses;
CREATE POLICY "Adults add expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults update expenses" ON public.expenses
  FOR UPDATE USING (public.is_household_adult(household_id, auth.uid()));
CREATE POLICY "Adults delete expenses" ON public.expenses
  FOR DELETE USING (public.is_household_adult(household_id, auth.uid()));

-- 4. recipe_views for personalization
CREATE TABLE IF NOT EXISTS public.recipe_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid,
  recipe_title text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_views_user_idx ON public.recipe_views (user_id, viewed_at DESC);

ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own views" ON public.recipe_views;
CREATE POLICY "Users view own views" ON public.recipe_views
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users add own views" ON public.recipe_views;
CREATE POLICY "Users add own views" ON public.recipe_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. realtime publication for food + shopping
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.food_items REPLICA IDENTITY FULL;
ALTER TABLE public.shopping_list_items REPLICA IDENTITY FULL;
