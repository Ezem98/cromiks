-- =============================================================================
-- Waitlist — captura de emails para la beta de junio 2026 (PR7 marketing, 11.4b)
-- =============================================================================
--
-- Tabla pública donde la landing guarda emails de gente que quiere entrar a la
-- beta. El dominio real todavía no se compró (feature-status 11.2), así que la
-- landing ofrece "dejá tu mail" en paralelo al /signup que ya funciona.
--
-- Insert anónimo permitido (el visitante NO está logueado). Lectura restringida
-- a service role (bypassa RLS) — ningún cliente con anon/publishable key puede
-- listar los emails capturados.
--
-- La action `joinWaitlist` (src/features/landing/actions.ts) hace el insert vía
-- el server client (anon key) y NO encadena .select(), porque no hay policy de
-- SELECT para anon. La unicidad de email se maneja en la action: violación de
-- unique (23505) → code 'already_subscribed' (mensaje amable, no error en Sentry).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  locale      text,                       -- es/en/pt/it detectado en el navegador
  source      text not null default 'landing',
  created_at  timestamptz not null default now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Insert público: cualquier visitante (anon) o user logueado puede sumarse.
-- WITH CHECK (true) — no hay datos del propio user que validar contra auth.uid().
DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;
CREATE POLICY "waitlist_insert_public" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Sin policy de SELECT a propósito: leer la lista de emails es solo para service
-- role (admin SDK / dashboard), que bypassa RLS. Nadie con anon key la enumera.
