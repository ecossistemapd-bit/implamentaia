-- ──────────────────────────────────────────────────────────────
-- Implementa AI · Admin: gestión de tickets de usuarios
-- 1. Actualiza admin_list_users() para exponer columna tickets
-- 2. Agrega admin_set_user_tickets(p_user_id, p_tickets) RPC
-- ──────────────────────────────────────────────────────────────

-- 1. Rebuild admin_list_users con columna tickets
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id         uuid,
  email      text,
  full_name  text,
  company_name text,
  role       text,
  created_at timestamptz,
  tickets    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_implementer_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT
      p.id,
      u.email::text,
      p.full_name,
      p.company_name,
      COALESCE(p.role, 'user'),
      COALESCE(u.created_at, p.created_at),
      COALESCE(p.tickets, 0)
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY u.created_at DESC;
END $$;

-- 2. RPC para que el admin asigne tickets a cualquier usuario
CREATE OR REPLACE FUNCTION public.admin_set_user_tickets(
  p_user_id UUID,
  p_tickets  INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_tickets < 0 THEN
    RAISE EXCEPTION 'tickets_negativo';
  END IF;

  UPDATE public.profiles SET tickets = p_tickets WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'usuario_no_encontrado';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_tickets(UUID, INTEGER) TO authenticated;
