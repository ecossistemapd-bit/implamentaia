-- Drop redundant narrower policies on builder_projects
DROP POLICY IF EXISTS "projects_select_own" ON public.builder_projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.builder_projects;

-- Revoke EXECUTE on SECURITY DEFINER functions from anon/public; keep authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_implementer_or_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_implementer_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;