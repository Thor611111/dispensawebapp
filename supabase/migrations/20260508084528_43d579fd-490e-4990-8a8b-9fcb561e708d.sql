
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles ins" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles del" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Bootstrap admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ab48bdf3-1c71-4653-ba72-04eb56492a48', 'admin')
ON CONFLICT DO NOTHING;

-- Push send log
CREATE TABLE public.push_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  household_id UUID,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read push log" ON public.push_send_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own push log" ON public.push_send_log FOR SELECT USING (auth.uid() = user_id);

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity" ON public.admin_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin: list users (with emails)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, display_name TEXT, created_at TIMESTAMPTZ,
  current_household_id UUID, is_admin BOOLEAN
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.display_name, u.created_at, p.current_household_id,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'users', (SELECT COUNT(*) FROM auth.users),
    'households', (SELECT COUNT(*) FROM public.households),
    'recipes', (SELECT COUNT(*) FROM public.recipes),
    'food_items', (SELECT COUNT(*) FROM public.food_items),
    'shopping_items', (SELECT COUNT(*) FROM public.shopping_list_items WHERE checked = false),
    'expenses_month', (SELECT COALESCE(SUM(amount),0) FROM public.expenses WHERE spent_on >= date_trunc('month', CURRENT_DATE)),
    'emails_7d', (SELECT COUNT(DISTINCT message_id) FROM public.email_send_log WHERE created_at >= now() - interval '7 days'),
    'push_7d', (SELECT COUNT(*) FROM public.push_send_log WHERE created_at >= now() - interval '7 days')
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_target_user UUID, _role public.app_role, _grant BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
  END IF;
END; $$;

-- Admin can read email_send_log
CREATE POLICY "Admins read email log" ON public.email_send_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
