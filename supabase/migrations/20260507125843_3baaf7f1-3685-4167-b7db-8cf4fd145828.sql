
-- Enums
CREATE TYPE public.food_location AS ENUM ('fridge', 'freezer', 'pantry', 'other');
CREATE TYPE public.diet_type AS ENUM ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'lactose_free', 'keto', 'mediterranean');
CREATE TYPE public.meal_slot AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE public.feedback_type AS ENUM ('liked', 'disliked', 'never');
CREATE TYPE public.member_role AS ENUM ('owner', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  current_household_id UUID,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Households
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Il mio nucleo',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.household_members (
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE public.household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: is user a member of a household?
CREATE OR REPLACE FUNCTION public.is_household_member(_household_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(_household_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.households
    WHERE id = _household_id AND owner_id = _user_id
  );
$$;

-- Preferences
CREATE TABLE public.user_preferences (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  household_size INT NOT NULL DEFAULT 1,
  diets public.diet_type[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  weekly_budget NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Food items
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  location public.food_location NOT NULL DEFAULT 'pantry',
  category TEXT,
  expires_on DATE,
  price NUMERIC(10,2),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_food_items_household ON public.food_items(household_id);
CREATE INDEX idx_food_items_expires ON public.food_items(household_id, expires_on);

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  servings INT NOT NULL DEFAULT 2,
  prep_minutes INT,
  difficulty TEXT,
  estimated_cost NUMERIC(10,2),
  diets public.diet_type[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipes_household ON public.recipes(household_id);

CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2),
  unit TEXT
);
CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);

CREATE TABLE public.recipe_feedback (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  feedback public.feedback_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

-- Meal plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_estimated_cost NUMERIC(10,2),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_start)
);

CREATE TABLE public.meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  slot public.meal_slot NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_title_snapshot TEXT,
  notes TEXT
);
CREATE INDEX idx_meal_plan_entries_plan ON public.meal_plan_entries(meal_plan_id);

-- Shopping list
CREATE TABLE public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  category TEXT,
  estimated_price NUMERIC(10,2),
  checked BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopping_household ON public.shopping_list_items(household_id);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_household ON public.expenses(household_id, spent_on);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Households policies
CREATE POLICY "Members view household" ON public.households FOR SELECT USING (public.is_household_member(id, auth.uid()));
CREATE POLICY "Auth users create households" ON public.households FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates household" ON public.households FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner deletes household" ON public.households FOR DELETE USING (auth.uid() = owner_id);

-- Household members policies
CREATE POLICY "View members of own households" ON public.household_members FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Owner adds members" ON public.household_members FOR INSERT WITH CHECK (public.is_household_owner(household_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Owner removes members" ON public.household_members FOR DELETE USING (public.is_household_owner(household_id, auth.uid()) OR user_id = auth.uid());

-- Invites policies
CREATE POLICY "Members view invites" ON public.household_invites FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members create invites" ON public.household_invites FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owner deletes invites" ON public.household_invites FOR DELETE USING (public.is_household_owner(household_id, auth.uid()));

-- Generic helper macro for household-owned tables
-- user_preferences
CREATE POLICY "Members view prefs" ON public.user_preferences FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members upsert prefs" ON public.user_preferences FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update prefs" ON public.user_preferences FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));

-- food_items
CREATE POLICY "Members view food" ON public.food_items FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add food" ON public.food_items FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update food" ON public.food_items FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete food" ON public.food_items FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

-- recipes
CREATE POLICY "Anyone views system recipes" ON public.recipes FOR SELECT USING (is_system = true OR (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid())));
CREATE POLICY "Members add recipes" ON public.recipes FOR INSERT WITH CHECK (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update own recipes" ON public.recipes FOR UPDATE USING (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete own recipes" ON public.recipes FOR DELETE USING (household_id IS NOT NULL AND public.is_household_member(household_id, auth.uid()));

-- recipe_ingredients
CREATE POLICY "View recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND (r.is_system = true OR public.is_household_member(r.household_id, auth.uid())))
);
CREATE POLICY "Manage own recipe ingredients ins" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.household_id IS NOT NULL AND public.is_household_member(r.household_id, auth.uid()))
);
CREATE POLICY "Manage own recipe ingredients upd" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.household_id IS NOT NULL AND public.is_household_member(r.household_id, auth.uid()))
);
CREATE POLICY "Manage own recipe ingredients del" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.household_id IS NOT NULL AND public.is_household_member(r.household_id, auth.uid()))
);

-- recipe_feedback
CREATE POLICY "Users view own feedback" ON public.recipe_feedback FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users add own feedback" ON public.recipe_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own feedback" ON public.recipe_feedback FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own feedback" ON public.recipe_feedback FOR DELETE USING (user_id = auth.uid());

-- meal_plans
CREATE POLICY "Members view plans" ON public.meal_plans FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add plans" ON public.meal_plans FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update plans" ON public.meal_plans FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete plans" ON public.meal_plans FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

-- meal_plan_entries
CREATE POLICY "View plan entries" ON public.meal_plan_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND public.is_household_member(p.household_id, auth.uid()))
);
CREATE POLICY "Add plan entries" ON public.meal_plan_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND public.is_household_member(p.household_id, auth.uid()))
);
CREATE POLICY "Update plan entries" ON public.meal_plan_entries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND public.is_household_member(p.household_id, auth.uid()))
);
CREATE POLICY "Delete plan entries" ON public.meal_plan_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND public.is_household_member(p.household_id, auth.uid()))
);

-- shopping_list_items
CREATE POLICY "Members view shopping" ON public.shopping_list_items FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add shopping" ON public.shopping_list_items FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update shopping" ON public.shopping_list_items FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete shopping" ON public.shopping_list_items FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

-- expenses
CREATE POLICY "Members view expenses" ON public.expenses FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add expenses" ON public.expenses FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update expenses" ON public.expenses FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete expenses" ON public.expenses FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_food_items_updated BEFORE UPDATE ON public.food_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan_entries;
