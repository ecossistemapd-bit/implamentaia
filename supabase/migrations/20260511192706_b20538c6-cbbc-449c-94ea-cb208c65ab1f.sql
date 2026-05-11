REVOKE EXECUTE ON FUNCTION public.is_implementer_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_implementer_or_admin(uuid) TO authenticated;