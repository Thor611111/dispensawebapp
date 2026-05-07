-- Grant execute on RLS helper functions to API roles
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO anon, authenticated;
