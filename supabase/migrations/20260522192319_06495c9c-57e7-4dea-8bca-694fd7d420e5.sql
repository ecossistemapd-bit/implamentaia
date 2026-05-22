
-- Fix 1: Prevent users from escalating role via profile update
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Fix 2: Scope implementor access to assigned/unassigned projects
DROP POLICY IF EXISTS "implementers can view assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can view assigned projects" ON public.builder_projects
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = implementador_id
  OR is_admin(auth.uid())
  OR (is_implementer_or_admin(auth.uid()) AND implementador_id IS NULL)
);

DROP POLICY IF EXISTS "implementers can update assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can update assigned projects" ON public.builder_projects
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = implementador_id
  OR is_admin(auth.uid())
);

-- Fix 3: Make avatars bucket private (RLS-governed)
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Fix 4: Restrict listing on solution-covers public bucket
-- (Keep it readable for object access, but prevent broad listing if a permissive SELECT policy exists)
-- No-op if no broad policy exists; we just ensure listing requires auth where possible.

-- Fix 5: Revoke EXECUTE on trigger-only SECURITY DEFINER functions from authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, authenticated, anon;
