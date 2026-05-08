-- Profiles: allow household co-members to read each other's display names.
CREATE OR REPLACE FUNCTION public.shares_household_with(_other uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members a
    JOIN public.household_members b ON a.household_id = b.household_id
    WHERE a.user_id = _user AND b.user_id = _other
  );
$$;
REVOKE EXECUTE ON FUNCTION public.shares_household_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_household_with(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Household co-members view profile" ON public.profiles;
CREATE POLICY "Household co-members view profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_household_with(id, auth.uid()));

-- Lock down internal SECURITY DEFINER helpers so end users can't call them via PostgREST.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_household() FROM PUBLIC, anon, authenticated;

-- Storage: drop broad listing policy on the public email-assets bucket.
DROP POLICY IF EXISTS "public read email-assets" ON storage.objects;
