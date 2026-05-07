-- Elimina tutti gli account utente esistenti e dati associati
DELETE FROM public.food_items;
DELETE FROM public.expenses;
DELETE FROM public.shopping_list_items;
DELETE FROM public.meal_plans;
DELETE FROM public.recipes;
DELETE FROM public.user_preferences;
DELETE FROM public.household_invites;
DELETE FROM public.household_members;
DELETE FROM public.pantries;
DELETE FROM public.households;
DELETE FROM public.profiles;
DELETE FROM auth.users;