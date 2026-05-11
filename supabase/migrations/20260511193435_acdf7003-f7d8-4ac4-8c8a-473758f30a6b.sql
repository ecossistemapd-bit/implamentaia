CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "admins can view all profiles" ON public.profiles;
CREATE POLICY "admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins can update all profiles" ON public.profiles;
CREATE POLICY "admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));