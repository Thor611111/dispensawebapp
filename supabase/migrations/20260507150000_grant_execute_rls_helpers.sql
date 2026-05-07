-- Allow API roles to execute SECURITY DEFINER helpers used in RLS policies.
-- Without these grants, every policy that calls is_household_member fails
-- with "permission denied for function".
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO anon, authenticated, service_role;
