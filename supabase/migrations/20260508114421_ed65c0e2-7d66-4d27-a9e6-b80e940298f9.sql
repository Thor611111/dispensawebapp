
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE TABLE IF NOT EXISTS public.app_owners (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_owners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_owners WHERE user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "Owners view owners" ON public.app_owners;
CREATE POLICY "Owners view owners" ON public.app_owners FOR SELECT USING (public.is_current_user_owner());
DROP POLICY IF EXISTS "Owners manage owners ins" ON public.app_owners;
CREATE POLICY "Owners manage owners ins" ON public.app_owners FOR INSERT WITH CHECK (public.is_current_user_owner());
DROP POLICY IF EXISTS "Owners manage owners del" ON public.app_owners;
CREATE POLICY "Owners manage owners del" ON public.app_owners FOR DELETE USING (public.is_current_user_owner());

INSERT INTO public.app_owners (user_id)
SELECT id FROM auth.users WHERE email = 'mangino.manuel2@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'users', (SELECT COUNT(*) FROM auth.users),
    'users_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
    'households', (SELECT COUNT(*) FROM public.households),
    'recipes', (SELECT COUNT(*) FROM public.recipes),
    'food_items', (SELECT COUNT(*) FROM public.food_items),
    'shopping_items', (SELECT COUNT(*) FROM public.shopping_list_items WHERE checked = false),
    'emails_7d', (SELECT COUNT(DISTINCT message_id) FROM public.email_send_log WHERE created_at >= now() - interval '7 days'),
    'emails_failed_24h', (SELECT COUNT(*) FROM public.email_send_log WHERE created_at >= now() - interval '24 hours' AND status <> 'sent'),
    'push_7d', (SELECT COUNT(*) FROM public.push_send_log WHERE created_at >= now() - interval '7 days'),
    'push_failed_24h', (SELECT COUNT(*) FROM public.push_send_log WHERE created_at >= now() - interval '24 hours' AND status <> 'sent'),
    'admin_actions_24h', (SELECT COUNT(*) FROM public.admin_activity_log WHERE created_at >= now() - interval '24 hours')
  ) INTO result;
  RETURN result;
END; $$;

CREATE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz, current_household_id uuid, is_admin boolean, is_owner boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.display_name, u.created_at, u.last_sign_in_at, p.current_household_id,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    EXISTS(SELECT 1 FROM public.app_owners o WHERE o.user_id = u.id)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_target_user uuid, _role app_role, _grant boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_display_name(_target_user uuid, _name text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET display_name = _name, updated_at = now() WHERE id = _target_user;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_purge_user_data(_target_user uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owned_ids uuid[];
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT array_agg(id) INTO owned_ids FROM public.households WHERE owner_id = _target_user;
  IF owned_ids IS NOT NULL THEN
    DELETE FROM public.food_items WHERE household_id = ANY(owned_ids);
    DELETE FROM public.expenses WHERE household_id = ANY(owned_ids);
    DELETE FROM public.shopping_list_items WHERE household_id = ANY(owned_ids);
    DELETE FROM public.user_preferences WHERE household_id = ANY(owned_ids);
    DELETE FROM public.household_invites WHERE household_id = ANY(owned_ids);
    DELETE FROM public.household_members WHERE household_id = ANY(owned_ids);
    DELETE FROM public.recipe_ingredients WHERE recipe_id IN (SELECT id FROM public.recipes WHERE household_id = ANY(owned_ids));
    DELETE FROM public.meal_plan_entries WHERE meal_plan_id IN (SELECT id FROM public.meal_plans WHERE household_id = ANY(owned_ids));
    DELETE FROM public.meal_plans WHERE household_id = ANY(owned_ids);
    DELETE FROM public.recipes WHERE household_id = ANY(owned_ids);
    DELETE FROM public.households WHERE id = ANY(owned_ids);
  END IF;
  DELETE FROM public.household_members WHERE user_id = _target_user;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  DELETE FROM public.app_owners WHERE user_id = _target_user;
  DELETE FROM public.push_subscriptions WHERE user_id = _target_user;
  DELETE FROM public.recipe_feedback WHERE user_id = _target_user;
  DELETE FROM public.profiles WHERE id = _target_user;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_log(_source text, _level text, _message text, _metadata jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_current_user_owner() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.admin_activity_log (source, level, message, metadata)
  VALUES (_source, _level, _message, _metadata);
END; $$;
