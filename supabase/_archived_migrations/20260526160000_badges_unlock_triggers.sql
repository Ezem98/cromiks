-- =============================================================================
-- Badges — auto-unlock triggers
-- =============================================================================
--
-- El catálogo de badges ya está sembrado (seed.ts) con 15 badges activas.
-- La tabla user_badges ya existe con shape (user_id, badge_id, unlocked_at,
-- is_pinned) y FKs a profiles(id) y badges(id).
--
-- Acá agregamos la lógica de unlock automático. Cada badge tiene un
-- unlock_condition jsonb del tipo:
--   { type: 'card_count',       threshold: N }
--   { type: 'rarity_obtained',  rarity: 'rare' | 'epic' | 'legendary' }
--   { type: 'all_legendaries' }
--   { type: 'streak',           threshold: N }
--   { type: 'share_count',      threshold: N }
--   { type: 'referral_count',   threshold: N }  -- diferido (no hay feature)
--
-- Estructura:
--   1. _check_and_unlock_badges(): función central que recorre badges activas
--      del type dado, evalúa condition contra el estado del user y, si se
--      cumple, hace INSERT idempotente en user_badges.
--
--   2. Triggers:
--      - user_cards INSERT          → card_count + rarity_obtained + all_legendaries
--      - streaks INSERT / UPDATE    → streak
--      - share_events INSERT        → share_count
--
--   3. RLS de user_badges:
--      - SELECT: público (las badges se muestran en /u/[username] sin auth)
--      - UPDATE: solo el dueño puede modificar is_pinned
--      - INSERT: solo vía triggers SECURITY DEFINER (sin policy explícita)
--
--   4. Backfill: dispara los checks para todos los users existentes una vez.
--      Idempotente — los INSERTs llevan ON CONFLICT DO NOTHING.
--
-- Decisión: AUTO-UNLOCK (sin claim manual). Las badges son cosméticas, no
-- entregan reward económico — agregar un step de claim sería fricción sin
-- payoff. Ver docs/features/badges.md.
--
-- No cubierto en este sprint:
--   - referral_count: no existe sistema de referrals. Las 2 badges
--     'first_referral' y 'referrals_10' quedan visibles como "Próximamente"
--     en la UI pero no se desbloquean nunca por trigger.
-- =============================================================================


-- =============================================================================
-- RLS defensivo
-- =============================================================================
-- Si las policies ya existen, las recreamos. Idempotente.

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_badges_select_all" ON public.user_badges;
CREATE POLICY "user_badges_select_all" ON public.user_badges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_badges_update_own_pin" ON public.user_badges;
CREATE POLICY "user_badges_update_own_pin" ON public.user_badges
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- INSERT: sin policy. Solo los triggers SECURITY DEFINER lo hacen.
-- DELETE: sin policy. Las badges no se "destransfieren".


-- =============================================================================
-- _check_and_unlock_badges
-- =============================================================================
--
-- Recibe (user_id, condition_type, context) y recorre las badges activas
-- del catálogo cuyo unlock_condition.type matchea. Para cada una, evalúa
-- si el user cumple la condition; si sí, hace INSERT idempotente.
--
-- El parámetro p_context se usa como shortcut: por ejemplo, si el trigger
-- de user_cards INSERT pasa { rarity: 'legendary' }, no hace falta volver a
-- queryear la rarity del cromo.
--
-- SECURITY DEFINER porque la llaman triggers con distintos auth.uid().
-- =============================================================================

CREATE OR REPLACE FUNCTION public._check_and_unlock_badges(
  p_user_id        uuid,
  p_condition_type text,
  p_context        jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_badge         record;
  v_threshold     int;
  v_target_rar    text;
  v_should_unlock boolean;
  v_owned_count   int;
  v_total_count   int;
begin
  for v_badge in
    select b.id, b.unlock_condition
    from public.badges b
    where b.is_active = true
      and b.unlock_condition->>'type' = p_condition_type
      and not exists (
        select 1 from public.user_badges ub
        where ub.user_id = p_user_id and ub.badge_id = b.id
      )
  loop
    v_should_unlock := false;

    case p_condition_type
      when 'card_count' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select count(distinct uc.card_id) into v_owned_count
        from public.user_cards uc
        join public.cards c on c.id = uc.card_id
        where uc.user_id = p_user_id
          and c.album_id = 'eterno-diciembre';
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      when 'rarity_obtained' then
        v_target_rar := v_badge.unlock_condition->>'rarity';
        -- Shortcut: si el context viene con la rarity actual, evita la subquery.
        if p_context->>'rarity' = v_target_rar then
          v_should_unlock := true;
        else
          select exists(
            select 1
            from public.user_cards uc
            join public.cards c on c.id = uc.card_id
            where uc.user_id = p_user_id
              and c.rarity = v_target_rar::card_rarity
          ) into v_should_unlock;
        end if;

      when 'all_legendaries' then
        -- Dinámico contra el catálogo: si tiene todas las legendarias del
        -- álbum eterno-diciembre, desbloquea. Hoy son 12 (no 11 como sugiere
        -- el nombre del badge 'Los 11 momentos' — el catálogo tiene 12
        -- legendarias). Si en el futuro se agrega más, el check sigue válido.
        select count(distinct uc.card_id) into v_owned_count
        from public.user_cards uc
        join public.cards c on c.id = uc.card_id
        where uc.user_id = p_user_id
          and c.album_id = 'eterno-diciembre'
          and c.rarity = 'legendary'::card_rarity;

        select count(*) into v_total_count
        from public.cards
        where album_id = 'eterno-diciembre'
          and rarity = 'legendary'::card_rarity;

        v_should_unlock := v_total_count > 0
          and coalesce(v_owned_count, 0) >= v_total_count;

      when 'streak' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select greatest(coalesce(s.current_streak, 0), coalesce(s.longest_streak, 0))
        into v_owned_count
        from public.streaks s
        where s.user_id = p_user_id;
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      when 'share_count' then
        v_threshold := (v_badge.unlock_condition->>'threshold')::int;
        select count(*) into v_owned_count
        from public.share_events
        where user_id = p_user_id;
        v_should_unlock := coalesce(v_owned_count, 0) >= v_threshold;

      else
        -- referral_count u otros types: no-op por ahora.
        v_should_unlock := false;
    end case;

    if v_should_unlock then
      insert into public.user_badges (user_id, badge_id, unlocked_at)
      values (p_user_id, v_badge.id, now())
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;
end;
$function$;

GRANT EXECUTE ON FUNCTION public._check_and_unlock_badges(uuid, text, jsonb) TO authenticated;


-- =============================================================================
-- Trigger 1: user_cards INSERT
-- =============================================================================
-- Cada vez que se INSERTA en user_cards (cromo nuevo), chequeamos:
--   - card_count (siempre)
--   - rarity_obtained (con shortcut via context.rarity)
--   - all_legendaries (solo si el cromo nuevo es legendary)

CREATE OR REPLACE FUNCTION public._on_user_card_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_rarity card_rarity;
begin
  select rarity into v_rarity from public.cards where id = new.card_id;

  perform public._check_and_unlock_badges(new.user_id, 'card_count', '{}'::jsonb);
  perform public._check_and_unlock_badges(
    new.user_id,
    'rarity_obtained',
    jsonb_build_object('rarity', v_rarity)
  );

  if v_rarity = 'legendary'::card_rarity then
    perform public._check_and_unlock_badges(new.user_id, 'all_legendaries', '{}'::jsonb);
  end if;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_check_badges_on_user_card ON public.user_cards;

CREATE TRIGGER trg_check_badges_on_user_card
AFTER INSERT ON public.user_cards
FOR EACH ROW
EXECUTE FUNCTION public._on_user_card_check_badges();


-- =============================================================================
-- Trigger 2: streaks INSERT / UPDATE
-- =============================================================================
-- Streaks se INSERT-ea al primer claim (current_streak=1) y se UPDATE-ea
-- cuando suma o se rompe. Cubrimos ambos casos así no perdemos el unlock
-- de 'streak_7' / 'streak_30' / 'streak_100'.

CREATE OR REPLACE FUNCTION public._on_streak_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public._check_and_unlock_badges(new.user_id, 'streak', '{}'::jsonb);
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_check_badges_on_streak_update ON public.streaks;
CREATE TRIGGER trg_check_badges_on_streak_update
AFTER UPDATE OF current_streak, longest_streak ON public.streaks
FOR EACH ROW
WHEN (
  new.current_streak IS DISTINCT FROM old.current_streak
  OR new.longest_streak IS DISTINCT FROM old.longest_streak
)
EXECUTE FUNCTION public._on_streak_check_badges();

DROP TRIGGER IF EXISTS trg_check_badges_on_streak_insert ON public.streaks;
CREATE TRIGGER trg_check_badges_on_streak_insert
AFTER INSERT ON public.streaks
FOR EACH ROW
EXECUTE FUNCTION public._on_streak_check_badges();


-- =============================================================================
-- Trigger 3: share_events INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public._on_share_event_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public._check_and_unlock_badges(new.user_id, 'share_count', '{}'::jsonb);
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_check_badges_on_share_event ON public.share_events;

CREATE TRIGGER trg_check_badges_on_share_event
AFTER INSERT ON public.share_events
FOR EACH ROW
EXECUTE FUNCTION public._on_share_event_check_badges();


-- =============================================================================
-- Backfill para users existentes
-- =============================================================================
-- Recorre todos los profiles y dispara los 5 checks. Esto cubre el caso de
-- users que ya cumplen condiciones (ej. ya tienen 50 cromos) pero no tenían
-- la badge porque la lógica no existía.
--
-- Idempotente: el INSERT interno lleva ON CONFLICT DO NOTHING.

DO $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select id from public.profiles where username is not null
  loop
    perform public._check_and_unlock_badges(v_user_id, 'card_count', '{}'::jsonb);
    perform public._check_and_unlock_badges(v_user_id, 'rarity_obtained', '{}'::jsonb);
    perform public._check_and_unlock_badges(v_user_id, 'all_legendaries', '{}'::jsonb);
    perform public._check_and_unlock_badges(v_user_id, 'streak', '{}'::jsonb);
    perform public._check_and_unlock_badges(v_user_id, 'share_count', '{}'::jsonb);
  end loop;
end;
$$;
