-- ============================================================
-- SECURITY HARDENING — 2026-05-22
-- Cierra los 5 issues detectados por el scanner de Lovable:
--   [ERROR]   Role escalation via profiles UPDATE
--   [WARNING] SECURITY DEFINER functions accesibles por public
--   [WARNING] Public bucket allows listing
-- Los dos restantes (Leaked Password Protection + avatar bucket)
-- se configuran desde el dashboard de Supabase (ver comentarios abajo).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. FIX P0: Role escalation
--    Problema: la policy "profiles_update_own" no tiene WITH CHECK,
--    por lo que un usuario puede hacer:
--      UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
--    y convertirse en admin.
--
--    Solución: trigger BEFORE UPDATE que revierte cualquier cambio
--    de rol cuando la conexión es de un usuario normal (auth.uid() ≠ null).
--    Cuando es service_role (dashboard / edge functions con service key),
--    auth.uid() devuelve null → los admins SÍ pueden cambiar roles.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lock_role_on_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() es NULL en conexiones service_role → admins pueden cambiar roles.
  -- Si es una sesión de usuario autenticado, el role NO puede cambiar.
  IF auth.uid() IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;  -- revertir silenciosamente
  END IF;
  RETURN NEW;
END;
$$;

-- Crear trigger (si ya existe, reemplazar)
DROP TRIGGER IF EXISTS profiles_lock_role ON public.profiles;
CREATE TRIGGER profiles_lock_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_role_on_self_update();


-- ────────────────────────────────────────────────────────────
-- 2. FIX: SECURITY DEFINER functions — revocar ejecución pública
--    Problema: las funciones SECURITY DEFINER son ejecutables
--    por cualquier rol (PUBLIC) aunque sean trigger-only.
--    Solución: revocar EXECUTE de PUBLIC; el trigger las invoca
--    con los permisos del owner (postgres), no del usuario.
-- ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lock_role_on_self_update() FROM PUBLIC;


-- ────────────────────────────────────────────────────────────
-- 3. FIX: Public Bucket Allows Listing
--    Problema: el bucket "avatars" tiene public = true, lo que
--    permite enumerar todos los archivos via Storage API.
--    Solución: desactivar el flag público del bucket.
--    Las imágenes siguen siendo accesibles por URL directa
--    gracias a la policy "avatars_public_read" existente.
-- ────────────────────────────────────────────────────────────

UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';


-- ────────────────────────────────────────────────────────────
-- PENDIENTE (requiere dashboard de Supabase, no SQL):
--
-- 4. Leaked Password Protection:
--    Authentication → Settings → Enable "Leaked Password Protection"
--    (chequea passwords contra HaveIBeenPwned)
--
-- 5. Avatar bucket "readable only by owner":
--    Authentication → Storage → avatars → si querés que solo el
--    dueño vea su avatar, cambiar la policy avatars_public_read
--    a: USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
--    OJO: esto rompe los avatares en cards de otros usuarios.
--    Como son fotos de perfil, el riesgo es bajo → se puede dejar.
-- ────────────────────────────────────────────────────────────
