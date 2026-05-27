-- ──────────────────────────────────────────────────────────────
-- Implementa AI · Mentorias
-- Tablas: mentores, mentorias, mentoria_bookings
-- Tickets: columna en profiles
-- RPC: consume_ticket_for_mentoria
-- ──────────────────────────────────────────────────────────────

-- 1. Tickets en profiles (saldo de tickets del usuario)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tickets INTEGER NOT NULL DEFAULT 0;

-- 2. Mentores
CREATE TABLE IF NOT EXISTS public.mentores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  specialties TEXT[]      NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentores_public_read" ON public.mentores
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "mentores_admin_all" ON public.mentores
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
GRANT SELECT ON public.mentores TO authenticated;
GRANT ALL ON public.mentores TO service_role;

-- 3. Mentorias (slots recurrentes, L-V × 4 franjas)
--    day_of_week: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie
--    time_slot: morning_1 (09:00), morning_2 (10:30), afternoon_1 (15:00), afternoon_2 (16:30)
CREATE TABLE IF NOT EXISTS public.mentorias (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT      NOT NULL DEFAULT 'Mentoría de IA',
  mentor_id        UUID      REFERENCES public.mentores(id) ON DELETE SET NULL,
  day_of_week      SMALLINT  NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  time_slot        TEXT      NOT NULL CHECK (time_slot IN ('morning_1','morning_2','afternoon_1','afternoon_2')),
  starts_at        TIME      NOT NULL,
  duration_minutes INTEGER   NOT NULL DEFAULT 60,
  meeting_url      TEXT,
  is_active        BOOLEAN   NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mentorias_day_slot_idx ON public.mentorias (day_of_week, time_slot);
ALTER TABLE public.mentorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentorias_public_read" ON public.mentorias
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "mentorias_admin_all" ON public.mentorias
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
GRANT SELECT ON public.mentorias TO authenticated;
GRANT ALL ON public.mentorias TO service_role;

-- 4. Reservas de mentoría (una por usuario × sesión × semana)
--    week_date = lunes de la semana (identificador canónico de la ocurrencia)
CREATE TABLE IF NOT EXISTS public.mentoria_bookings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentoria_id     UUID        NOT NULL REFERENCES public.mentorias(id) ON DELETE CASCADE,
  week_date       DATE        NOT NULL,
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended        BOOLEAN     NOT NULL DEFAULT false,
  ticket_consumed BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (user_id, mentoria_id, week_date)
);
CREATE INDEX IF NOT EXISTS mentoria_bookings_user_week_idx ON public.mentoria_bookings (user_id, week_date);
ALTER TABLE public.mentoria_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select_own" ON public.mentoria_bookings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bookings_insert_own" ON public.mentoria_bookings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_admin_all" ON public.mentoria_bookings
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
GRANT SELECT, INSERT ON public.mentoria_bookings TO authenticated;
GRANT ALL ON public.mentoria_bookings TO service_role;

-- 5. RPC: consume 1 ticket y crea la reserva (transacción atómica)
CREATE OR REPLACE FUNCTION public.consume_ticket_for_mentoria(
  p_mentoria_id UUID,
  p_week_date   DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_tickets    INTEGER;
  v_booking_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_auth');
  END IF;

  -- Lock row and check saldo
  SELECT tickets INTO v_tickets
  FROM profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF v_tickets IS NULL OR v_tickets < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_tickets');
  END IF;

  -- Insertar reserva (skip si ya existe)
  INSERT INTO mentoria_bookings (user_id, mentoria_id, week_date, ticket_consumed)
  VALUES (v_uid, p_mentoria_id, p_week_date, true)
  ON CONFLICT (user_id, mentoria_id, week_date) DO NOTHING
  RETURNING id INTO v_booking_id;

  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ya_reservado');
  END IF;

  -- Descontar ticket
  UPDATE profiles SET tickets = tickets - 1 WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ticket_for_mentoria(UUID, DATE) TO authenticated;

-- ── Seed: Mentores ─────────────────────────────────────────────
INSERT INTO public.mentores (id, full_name, role, bio, specialties) VALUES
(
  '11111111-0001-0001-0001-000000000001',
  'Pablo Rodríguez',
  'Especialista en Automatización',
  'Más de 5 años implementando soluciones de IA en empresas de LatAm. Experto en n8n, Make y flujos de automatización complejos con impacto real en operaciones.',
  ARRAY['Automatización', 'n8n', 'Make', 'Zapier']
),
(
  '11111111-0001-0001-0001-000000000002',
  'María García',
  'Experta en Chatbots y NLP',
  'Desarrolla chatbots inteligentes para ventas y atención al cliente usando WhatsApp Business API y modelos de lenguaje de última generación.',
  ARRAY['Chatbots', 'WhatsApp API', 'NLP', 'OpenAI']
),
(
  '11111111-0001-0001-0001-000000000003',
  'Javier López',
  'Arquitecto de Soluciones IA',
  'Diseña arquitecturas IA end-to-end para empresas B2B, con foco en escalabilidad, integración de herramientas y medición de ROI desde el primer sprint.',
  ARRAY['Arquitectura', 'Claude', 'Supabase', 'ROI']
)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Mentorias (4 slots × 5 días = 20 sesiones) ──────────
INSERT INTO public.mentorias
  (title, mentor_id, day_of_week, time_slot, starts_at, duration_minutes, meeting_url)
VALUES
-- LUNES
('Mentoría Express — Automatización',       '11111111-0001-0001-0001-000000000001', 1, 'morning_1',   '09:00', 60, 'https://meet.google.com/implementa-lun-m1'),
('Workshop de Flujos IA',                   '11111111-0001-0001-0001-000000000002', 1, 'morning_2',   '10:30', 60, 'https://meet.google.com/implementa-lun-m2'),
('Mentoría IA Aplicada',                    '11111111-0001-0001-0001-000000000003', 1, 'afternoon_1', '15:00', 60, 'https://meet.google.com/implementa-lun-t1'),
('Clínica de Implementación',               '11111111-0001-0001-0001-000000000001', 1, 'afternoon_2', '16:30', 60, 'https://meet.google.com/implementa-lun-t2'),
-- MARTES
('Mentoría Express — Chatbots',             '11111111-0001-0001-0001-000000000002', 2, 'morning_1',   '09:00', 60, 'https://meet.google.com/implementa-mar-m1'),
('Workshop NLP Práctico',                   '11111111-0001-0001-0001-000000000003', 2, 'morning_2',   '10:30', 60, 'https://meet.google.com/implementa-mar-m2'),
('Mentoría IA Aplicada',                    '11111111-0001-0001-0001-000000000001', 2, 'afternoon_1', '15:00', 60, 'https://meet.google.com/implementa-mar-t1'),
('Clínica de Implementación',               '11111111-0001-0001-0001-000000000002', 2, 'afternoon_2', '16:30', 60, 'https://meet.google.com/implementa-mar-t2'),
-- MIÉRCOLES
('Mentoría Express — Arquitectura',         '11111111-0001-0001-0001-000000000003', 3, 'morning_1',   '09:00', 60, 'https://meet.google.com/implementa-mie-m1'),
('Workshop Claude API',                     '11111111-0001-0001-0001-000000000001', 3, 'morning_2',   '10:30', 60, 'https://meet.google.com/implementa-mie-m2'),
('Mentoría IA Aplicada',                    '11111111-0001-0001-0001-000000000002', 3, 'afternoon_1', '15:00', 60, 'https://meet.google.com/implementa-mie-t1'),
('Clínica de Implementación',               '11111111-0001-0001-0001-000000000003', 3, 'afternoon_2', '16:30', 60, 'https://meet.google.com/implementa-mie-t2'),
-- JUEVES
('Mentoría Express — ROI IA',               '11111111-0001-0001-0001-000000000001', 4, 'morning_1',   '09:00', 60, 'https://meet.google.com/implementa-jue-m1'),
('Workshop Automatización Avanzada',        '11111111-0001-0001-0001-000000000002', 4, 'morning_2',   '10:30', 60, 'https://meet.google.com/implementa-jue-m2'),
('Mentoría IA Aplicada',                    '11111111-0001-0001-0001-000000000003', 4, 'afternoon_1', '15:00', 60, 'https://meet.google.com/implementa-jue-t1'),
('Clínica de Implementación',               '11111111-0001-0001-0001-000000000001', 4, 'afternoon_2', '16:30', 60, 'https://meet.google.com/implementa-jue-t2'),
-- VIERNES
('Mentoría Express — Estrategia IA',        '11111111-0001-0001-0001-000000000002', 5, 'morning_1',   '09:00', 60, 'https://meet.google.com/implementa-vie-m1'),
('Workshop de Casos de Uso',                '11111111-0001-0001-0001-000000000003', 5, 'morning_2',   '10:30', 60, 'https://meet.google.com/implementa-vie-m2'),
('Mentoría IA Aplicada',                    '11111111-0001-0001-0001-000000000001', 5, 'afternoon_1', '15:00', 60, 'https://meet.google.com/implementa-vie-t1'),
('Cierre Semanal — Q&A IA',                 '11111111-0001-0001-0001-000000000002', 5, 'afternoon_2', '16:30', 60, 'https://meet.google.com/implementa-vie-t2')
ON CONFLICT DO NOTHING;
