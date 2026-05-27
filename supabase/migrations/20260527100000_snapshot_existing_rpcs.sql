-- =============================================================================
-- Snapshot inicial de RPCs creadas vía Supabase Studio antes de versionarse
-- en migrations.
-- =============================================================================
-- Captura `claim_daily_pack` y `dismantle_card` con su estado actual en el
-- proyecto remoto (output de `pg_get_functiondef`). A partir de acá quedan
-- versionadas como cualquier otra RPC. Sin cambios funcionales en este archivo.
--
-- Audit del anti-pattern de replay (B-22 fue el ejemplo paradigmático):
--   - claim_daily_pack: tiene status-check anti-pattern (last_claim_date) pero
--     se invoca sólo desde click manual (home/actions.ts:27), no desde Server
--     Component. Riesgo de double-execution es bajo (Client Component con
--     disabled state). No requiere migration idempotente.
--   - dismantle_card: NO es replay-vulnerable. Es contador/drain por diseño;
--     cada invocación decrementa intencionalmente. Hacerlo idempotente
--     rompería el contrato.
-- =============================================================================

DROP FUNCTION IF EXISTS public.claim_daily_pack();

CREATE OR REPLACE FUNCTION public.claim_daily_pack()
 RETURNS TABLE(pack_id uuid, new_streak integer, is_first_claim boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_today date := current_date;
  v_streak record;
  v_new_streak int;
  v_pack_id uuid;
  v_is_first boolean;
begin
  -- Obtener user actual
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Lock del streak para evitar race conditions
  select * into v_streak
  from public.streaks
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'streak_not_initialized' using errcode = 'P0001';
  end if;

  -- ¿Ya reclamó hoy?
  if v_streak.last_claim_date = v_today then
    raise exception 'already_claimed_today' using errcode = 'P0001';
  end if;

  -- Calcular nueva racha
  v_is_first := v_streak.last_claim_date is null;

  if v_is_first then
    v_new_streak := 1;
  elsif v_streak.last_claim_date = v_today - interval '1 day' then
    v_new_streak := v_streak.current_streak + 1;
  else
    -- Perdió la racha, reinicia
    v_new_streak := 1;
  end if;

  -- Actualizar streak
  update public.streaks
  set
    current_streak = v_new_streak,
    longest_streak = greatest(longest_streak, v_new_streak),
    last_claim_date = v_today,
    total_claims = total_claims + 1
  where user_id = v_user_id;

  -- Crear el sobre
  insert into public.packs (user_id, type, card_count, context, available_at, expires_at)
  values (
    v_user_id,
    'daily',
    4,
    jsonb_build_object('streak_day', v_new_streak),
    now(),
    now() + interval '7 days'      -- expira en 7 días si no se abre
  )
  returning id into v_pack_id;

  return query select v_pack_id, v_new_streak, v_is_first;
end;
$function$;


DROP FUNCTION IF EXISTS public.dismantle_card(text, integer);

CREATE OR REPLACE FUNCTION public.dismantle_card(p_card_id text, p_count integer DEFAULT 1)
 RETURNS TABLE(copies_left integer, coins_earned integer, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_user_card record;
  v_card record;
  v_reward_per_card int;
  v_total_reward int;
  v_new_copies int;
  v_new_balance int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_count < 1 then
    raise exception 'invalid_count' using errcode = 'P0001';
  end if;

  -- Validar cromo
  select * into v_card from public.cards where id = p_card_id;
  if not found then
    raise exception 'card_not_found' using errcode = 'P0001';
  end if;

  -- Legendarias NO se canjean
  if v_card.rarity = 'legendary' then
    raise exception 'legendary_not_dismantlable' using errcode = 'P0001';
  end if;

  -- Lock del user_card
  select * into v_user_card
  from public.user_cards
  where user_id = v_user_id and card_id = p_card_id
  for update;

  if not found then
    raise exception 'card_not_owned' using errcode = 'P0001';
  end if;

  -- Debe quedarle al menos 1 copia
  if v_user_card.copies - p_count < 1 then
    raise exception 'must_keep_one' using errcode = 'P0001';
  end if;

  -- Reward por rareza
  v_reward_per_card := case v_card.rarity
    when 'common' then 2
    when 'uncommon' then 5
    when 'rare' then 15
    when 'epic' then 40
    else 0
  end;

  v_total_reward := v_reward_per_card * p_count;
  v_new_copies := v_user_card.copies - p_count;

  -- Actualizar copies
  update public.user_cards
  set copies = v_new_copies
  where user_id = v_user_id and card_id = p_card_id;

  -- Actualizar balance del user
  update public.user_coins
  set
    balance = balance + v_total_reward,
    total_earned = total_earned + v_total_reward
  where user_id = v_user_id
  returning balance into v_new_balance;

  -- Ledger
  insert into public.coin_transactions (user_id, amount, reason, reference_id, balance_after)
  values (v_user_id, v_total_reward, 'dismantle_repeat', p_card_id, v_new_balance);

  return query select v_new_copies, v_total_reward, v_new_balance;
end;
$function$;
