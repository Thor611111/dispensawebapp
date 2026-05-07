
-- pantries table
CREATE TABLE public.pantries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Casa',
  icon TEXT NOT NULL DEFAULT 'home',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pantries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view pantries" ON public.pantries FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add pantries" ON public.pantries FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members update pantries" ON public.pantries FOR UPDATE USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete pantries" ON public.pantries FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

-- recommended_products
CREATE TABLE public.recommended_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recommended_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view recs" ON public.recommended_products FOR SELECT USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members add recs" ON public.recommended_products FOR INSERT WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members delete recs" ON public.recommended_products FOR DELETE USING (public.is_household_member(household_id, auth.uid()));

ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS kcal_per_unit NUMERIC;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS pantry_id UUID;

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- recipe_feedback: switch to id PK and allow feedback by title
ALTER TABLE public.recipe_feedback DROP CONSTRAINT IF EXISTS recipe_feedback_pkey;
ALTER TABLE public.recipe_feedback ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.recipe_feedback ADD PRIMARY KEY (id);
ALTER TABLE public.recipe_feedback ALTER COLUMN recipe_id DROP NOT NULL;
ALTER TABLE public.recipe_feedback ADD COLUMN IF NOT EXISTS recipe_title TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_household()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pantries (household_id, name, icon) VALUES (NEW.id, 'Casa', 'home');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_household_created ON public.households;
CREATE TRIGGER on_household_created AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_household();

INSERT INTO public.pantries (household_id, name, icon)
SELECT h.id, 'Casa', 'home' FROM public.households h
LEFT JOIN public.pantries p ON p.household_id = h.id
WHERE p.id IS NULL;
