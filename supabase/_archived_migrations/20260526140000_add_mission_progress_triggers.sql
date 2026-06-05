-- =============================================================================
-- Auto-trigger de progress de misiones
-- =============================================================================
--
-- Antes de esta migration, user_missions.progress nunca se incrementaba
-- automáticamente. Las misiones se asignaban (assignDailyMissions) pero
-- quedaban en status='active' y progress=0 para siempre.
--
-- Acá creamos:
--   1. _advance_missions(): función central que recibe (user_id, type, increment, context)
--      y avanza todas las misiones del user de ese tipo respetando los filtros
--      del config (only_new, min_rarity).
--
--   2. Triggers en packs, user_cards:
--      - packs.status: pending → opened   →  advance 'open_pack'
--      - user_cards INSERT (cromo nuevo)  →  advance 'collect_rarity'
--      - user_cards.is_pinned: f → t      →  advance 'pin_card'
--
-- Tipos de mission NO cubiertos todavía:
--   - share_card     → llega con E3 (sharing). Trigger sobre share_events.
--   - complete_page  → más complejo, requiere checkear si una página entera está
--                      owned. TODO para próximo sprint.
--   - login_streak   → trigger sobre streaks.current_streak. TODO.
--
-- Filtros del config:
--   - only_new (bool)     → solo avanza si context.is_new = true
--   - min_rarity (string) → solo avanza si context.rarity >= min_rarity
--
-- Por defaults: si una mission no tiene ningún filtro en config, avanza siempre
-- que matchee el type.
-- =============================================================================

-- Defensa: asegurar que user_missions tiene completed_at para analytics futuro.
-- Si ya existe, el ADD IF NOT EXISTS es no-op.
ALTER TABLE public.user_missions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;


-- =============================================================================
-- _advance_missions
-- =============================================================================
--
-- Función central que recorre todas las user_missions activas del user con
-- el type dado, valida filtros, y avanza progress (marcando completed si
-- alcanza el target).
--
-- Diseño defensivo: cada filtro es opt-in. Si el config no tiene el filtro,
-- no se aplica. Si el context no tiene el campo, los filtros que lo
-- necesitan rechazan la mission.
--
-- SECURITY DEFINER porque los triggers la llaman como auth.uid() variando.
-- =============================================================================

CREATE OR REPLACE FUNCTION public._advance_missions(
  p_user_id   uuid,
  p_type      mission_type,
  p_increment integer DEFAULT 1,
  p_context   jsonb   DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_mission        record;
  v_should_advance boolean;
  v_new_progress   integer;
  v_min_rarity_rank int;
  v_ctx_rarity_rank int;
begin
  -- Recorrer todas las misiones activas del user del type dado
  for v_mission in
    select um.id, um.progress, um.target, mt.config
    from public.user_missions um
    join public.mission_templates mt on mt.id = um.mission_template_id
    where um.user_id = p_user_id
      and um.status = 'active'
      and mt.type = p_type
      and (um.expires_at is null or um.expires_at > now())
    for update of um  -- lock para evitar race conditions entre triggers
  loop
    v_should_advance := true;

    -- Filtro: only_new
    -- Si la mission tiene only_new=true y el context NO trae is_new=true, skip.
    if (v_mission.config->>'only_new')::boolean is true then
      if (p_context->>'is_new')::boolean is distinct from true then
        v_should_advance := false;
      end if;
    end if;

    -- Filtro: min_rarity
    -- Si la mission tiene min_rarity, comparar con context.rarity.
    if v_should_advance and v_mission.config->>'min_rarity' is not null then
      v_min_rarity_rank := case v_mission.config->>'min_rarity'
        when 'common'    then 1
        when 'uncommon'  then 2
        when 'rare'      then 3
        when 'epic'      then 4
        when 'legendary' then 5
        else 0
      end;
      v_ctx_rarity_rank := case p_context->>'rarity'
        when 'common'    then 1
        when 'uncommon'  then 2
        when 'rare'      then 3
        when 'epic'      then 4
        when 'legendary' then 5
        else 0
      end;
      if v_ctx_rarity_rank < v_min_rarity_rank then
        v_should_advance := false;
      end if;
    end if;

    if not v_should_advance then
      continue;
    end if;

    -- Avanzar progress
    v_new_progress := v_mission.progress + p_increment;

    if v_new_progress >= v_mission.target then
      update public.user_missions
      set progress     = v_mission.target,
          status       = 'completed',
          completed_at = now()
      where id = v_mission.id;
    else
      update public.user_missions
      set progress = v_new_progress
      where id = v_mission.id;
    end if;
  end loop;
end;
$function$;


-- =============================================================================
-- Trigger 1: pack opened → advance 'open_pack' missions
-- =============================================================================
--
-- Dispara cuando packs.status pasa de 'pending' a 'opened'. Pasa context vacío
-- porque la action es "abrir un sobre", no granular por cromo.
--
-- Esto avanza missions como 'open_1_pack' (target 1) y 'open_3_packs' (target 3).
-- NO avanza 'new_5_cards' porque esa va por el trigger de user_cards (es per-cromo,
-- y ya la cambiamos a type='collect_rarity').
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_pack_opened()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if old.status = 'pending' and new.status = 'opened' then
    perform public._advance_missions(new.user_id, 'open_pack'::mission_type, 1, '{}'::jsonb);
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_advance_open_pack ON public.packs;

CREATE TRIGGER trg_advance_open_pack
AFTER UPDATE OF status ON public.packs
FOR EACH ROW
WHEN (old.status = 'pending' AND new.status = 'opened')
EXECUTE FUNCTION public._on_pack_opened();


-- =============================================================================
-- Trigger 2: user_card insertado → advance 'collect_rarity' missions
-- =============================================================================
--
-- Dispara cuando se INSERTA una row en user_cards. Pasa context con la rarity
-- de la card y is_new=true (porque INSERT implica primera obtención).
--
-- Esto avanza:
--  - 'collect_rare' (min_rarity=rare, only_new=true)
--  - 'new_5_cards' después de cambiarla a type='collect_rarity' (only_new=true)
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_user_card_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_rarity card_rarity;
begin
  -- Get rarity de la card
  select rarity into v_rarity from public.cards where id = new.card_id;

  -- Avanzar missions de type collect_rarity con context completo
  perform public._advance_missions(
    new.user_id,
    'collect_rarity'::mission_type,
    1,
    jsonb_build_object('rarity', v_rarity, 'is_new', true)
  );

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_advance_collect_rarity ON public.user_cards;

CREATE TRIGGER trg_advance_collect_rarity
AFTER INSERT ON public.user_cards
FOR EACH ROW
EXECUTE FUNCTION public._on_user_card_inserted();


-- =============================================================================
-- Trigger 3: user_card pinned → advance 'pin_card' missions
-- =============================================================================
--
-- Dispara cuando user_cards.is_pinned pasa de false a true.
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_user_card_pinned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if old.is_pinned is distinct from true and new.is_pinned is true then
    perform public._advance_missions(new.user_id, 'pin_card'::mission_type, 1, '{}'::jsonb);
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_advance_pin_card ON public.user_cards;

CREATE TRIGGER trg_advance_pin_card
AFTER UPDATE OF is_pinned ON public.user_cards
FOR EACH ROW
WHEN (old.is_pinned IS DISTINCT FROM true AND new.is_pinned IS true)
EXECUTE FUNCTION public._on_user_card_pinned();


-- =============================================================================
-- Cleanup de mission_templates
-- =============================================================================
--
-- 1. new_5_cards: estaba mal tipada como 'open_pack' con only_new=true.
--    Conceptualmente es "sumá 5 cromos nuevos", que es collect_rarity sin
--    filtro de rareza (cualquier rarity vale). La cambiamos para que matchee
--    el trigger correcto.
--
-- 2. share_card: la feature de compartir todavía no existe (E3 futuro). Si
--    sale en el daily pool, el user no puede completarla nunca. La sacamos
--    del pool temporalmente. Cuando E3 esté implementado, volver a setear
--    is_daily_pool=true.
-- =============================================================================

UPDATE public.mission_templates
SET
  type = 'collect_rarity',
  config = config - 'min_rarity' || jsonb_build_object('only_new', true, 'target_count', 5)
WHERE id = 'new_5_cards';

UPDATE public.mission_templates
SET is_daily_pool = false
WHERE id = 'share_card';


-- =============================================================================
-- Grants
-- =============================================================================
-- Los triggers corren como SECURITY DEFINER, así que técnicamente no necesitan
-- grants. Pero para llamarla desde otras funciones SQL (si alguna vez lo
-- hacemos), GRANT EXECUTE a authenticated.

GRANT EXECUTE ON FUNCTION public._advance_missions(uuid, mission_type, integer, jsonb) TO authenticated;
