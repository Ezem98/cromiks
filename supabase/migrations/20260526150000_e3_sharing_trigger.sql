-- =============================================================================
-- E3 Sharing — Trigger de progress para misiones share_card
-- =============================================================================
--
-- Cierra el lado de DB del feature de sharing:
--   1. Asegura que existe la tabla share_events (con esquema mínimo si no existe).
--   2. Crea trigger AFTER INSERT que avanza misiones de tipo share_card.
--   3. Re-habilita el template 'share_card' en el pool diario (lo habíamos
--      sacado en la migration anterior porque no había feature todavía).
--
-- La función _advance_missions ya existe (migration 140000).
--
-- share_events schema (si la tabla NO existe todavía):
--   - id: uuid pk
--   - user_id: uuid FK auth.users (el que comparte)
--   - card_id: text FK cards.id (qué cromo)
--   - channel: text (twitter, whatsapp, copy, native, etc.)
--   - created_at: timestamptz
--
-- Si la tabla YA existe con otro schema, el CREATE TABLE IF NOT EXISTS es no-op.
-- El trigger asume al menos user_id y card_id; si no existen, hay que ajustar.
-- =============================================================================

-- Defensa: crear share_events si no existe
CREATE TABLE IF NOT EXISTS public.share_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_id     text not null references public.cards(id) on delete cascade,
  channel     text,
  created_at  timestamptz not null default now()
);

-- Index para queries por user_id (perfil "qué compartí")
CREATE INDEX IF NOT EXISTS idx_share_events_user_id ON public.share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_card_id ON public.share_events(card_id);

-- RLS: solo el user puede insertar sus propios shares, todos pueden ver shares
-- (los share events son públicos para analytics/social proof; pero solo escribís los tuyos)
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_events_select_all" ON public.share_events;
CREATE POLICY "share_events_select_all" ON public.share_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "share_events_insert_own" ON public.share_events;
CREATE POLICY "share_events_insert_own" ON public.share_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- Trigger: share_event creado → advance 'share_card' missions
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_share_event_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Pasamos el channel como context por si en el futuro hay misiones del tipo
  -- "compartí por Twitter específicamente". Por ahora ningún filtro lo usa.
  perform public._advance_missions(
    new.user_id,
    'share_card'::mission_type,
    1,
    jsonb_build_object('channel', coalesce(new.channel, 'unknown'))
  );
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_advance_share_card ON public.share_events;

CREATE TRIGGER trg_advance_share_card
AFTER INSERT ON public.share_events
FOR EACH ROW
EXECUTE FUNCTION public._on_share_event_inserted();


-- =============================================================================
-- Re-habilitar share_card en el pool diario
-- =============================================================================
-- En la migration de triggers (140000) habíamos sacado share_card del pool
-- porque el feature no existía. Ahora sí existe.

UPDATE public.mission_templates
SET is_daily_pool = true
WHERE id = 'share_card';
