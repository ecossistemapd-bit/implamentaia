
-- 1) Prevent self role escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_update();

-- Simplify the update policy now that the trigger guards role changes
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 2) Implementors only see explicitly assigned projects
DROP POLICY IF EXISTS "implementers can view assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can view assigned projects"
ON public.builder_projects
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = implementador_id
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "implementers can update assigned projects" ON public.builder_projects;
CREATE POLICY "implementers can update assigned projects"
ON public.builder_projects
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = implementador_id
  OR public.is_admin(auth.uid())
);

-- 3) allowed_emails admin policies via is_admin()
DROP POLICY IF EXISTS "Admins can read allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Admins can insert allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Admins can delete allowed_emails" ON public.allowed_emails;

CREATE POLICY "Admins can read allowed_emails" ON public.allowed_emails
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert allowed_emails" ON public.allowed_emails
FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete allowed_emails" ON public.allowed_emails
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
