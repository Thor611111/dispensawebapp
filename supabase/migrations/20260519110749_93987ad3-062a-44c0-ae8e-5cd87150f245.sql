-- 1. Revoke EXECUTE from PUBLIC on every SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_household() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_household_with(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_owner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.accept_household_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_log(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_display_name(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_purge_user_data(uuid) FROM PUBLIC, anon;

-- 2. Grant back to service_role for queue / trigger helpers
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_household() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

-- 3. Grant back to authenticated for legitimately user-callable RPCs
--    (these self-check is_current_user_owner / auth.uid())
GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_display_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid) TO authenticated;

-- 4. RLS helpers: grant to authenticated (they're called from RLS policies as the user)
GRANT EXECUTE ON FUNCTION public.is_household_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_household_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;