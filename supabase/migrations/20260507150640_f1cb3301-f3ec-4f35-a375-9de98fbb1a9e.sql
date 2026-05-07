DROP POLICY IF EXISTS "Members view household" ON public.households;

CREATE POLICY "Members or owner view household"
ON public.households
FOR SELECT
USING (
  auth.uid() = owner_id
  OR public.is_household_member(id, auth.uid())
);