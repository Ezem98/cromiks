-- =============================================================================
-- Fix: claim_mission + open_pack escriben contra columna inexistente
-- =============================================================================
--
-- Síntoma:
--   ERROR: column "lifetime_earned" of relation "user_coins" does not exist
--
-- La tabla public.user_coins tiene las columnas (balance, total_earned,
-- total_spent, updated_at). Pero claim_mission y open_pack fueron escritas
-- contra una columna `lifetime_earned` que nunca existió en prod (drift de
-- esquema entre el modelo de la tabla y las RPCs).
--
-- Efecto:
--   1. claim_mission → TODA misión diaria da reward_coins > 0, así que cada
--      "Reclamar" explotaba al insertar en user_coins. La server action caía al
--      branch `unknown` y el usuario veía un toast de error genérico.
--   2. open_pack → solo rompía en la rama de monedas por repetidas
--      (v_total_earned > 0). Abrir un sobre de cromos nuevos andaba; el primer
--      sobre con una repetida tiraba el mismo error. Bomba de tiempo para beta.
--
-- Fix: alinear ambas funciones a la columna real `total_earned`. Las funciones
-- son las definiciones desplegadas vivas (pg_get_functiondef), idénticas salvo
-- el swap lifetime_earned → total_earned.
--
-- Bonus (data fix): new_5_cards quedó mal tipada como 'open_pack' con
-- only_new=true (combinación insatisfacible — el trigger de open_pack avanza
-- con contexto vacío y el filtro only_new la rechaza siempre). La migración
-- 140000 ya la había corregido a 'collect_rarity', pero scripts/seed.ts la
-- volvía a pisar. Re-aplicamos el fix acá (seed.ts se corrige en el mismo PR).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- claim_mission — lifetime_earned → total_earned
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_mission(p_user_mission_id uuid)
 RETURNS TABLE(out_coins_earned integer, out_pack_id uuid, out_cards_earned integer, out_new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id     uuid;
  v_mission     record;
  v_template    record;
  v_pack_id     uuid;
  v_new_balance integer;
  v_card_count  integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Lock de la misión
  select um.* into v_mission
  from public.user_missions um
  where um.id = p_user_mission_id and um.user_id = v_user_id
  for update;

  if not found then
    raise exception 'mission_not_found' using errcode = 'P0001';
  end if;

  if v_mission.status != 'completed' then
    raise exception 'mission_not_completed' using errcode = 'P0001';
  end if;

  -- Obtener template
  select mt.* into v_template
  from public.mission_templates mt
  where mt.id = v_mission.mission_template_id;

  if not found then
    raise exception 'template_not_found' using errcode = 'P0001';
  end if;

  -- Apply reward_coins (si > 0)
  if v_template.reward_coins is not null and v_template.reward_coins > 0 then
    insert into public.user_coins (user_id, balance, total_earned)
    values (v_user_id, v_template.reward_coins, v_template.reward_coins)
    on conflict (user_id) do update
    set balance      = public.user_coins.balance + v_template.reward_coins,
        total_earned = public.user_coins.total_earned + v_template.reward_coins,
        updated_at   = now()
    returning public.user_coins.balance into v_new_balance;
  else
    select coalesce(uc.balance, 0) into v_new_balance
    from public.user_coins uc where uc.user_id = v_user_id;
    v_new_balance := coalesce(v_new_balance, 0);
  end if;

  -- Apply reward_pack_type (si está definido)
  v_card_count := coalesce(v_template.reward_card_count, 0);
  if v_template.reward_pack_type is not null then
    -- Si reward_card_count viene null, usamos default por tipo (5 para mission packs)
    if v_card_count <= 0 then
      v_card_count := 5;
    end if;

    insert into public.packs (user_id, type, card_count, status, available_at, context)
    values (
      v_user_id,
      v_template.reward_pack_type,
      v_card_count,
      'pending',
      now(),
      jsonb_build_object('source_mission_template', v_template.id)
    )
    returning id into v_pack_id;
  end if;

  -- Marcar misión como claimed
  update public.user_missions
  set status     = 'claimed',
      claimed_at = now()
  where id = p_user_mission_id;

  -- Return rewards
  return query select
    coalesce(v_template.reward_coins, 0)::integer  as out_coins_earned,
    v_pack_id                                       as out_pack_id,
    coalesce(v_card_count, 0)::integer              as out_cards_earned,
    v_new_balance::integer                          as out_new_balance;
end;
$function$;


-- -----------------------------------------------------------------------------
-- open_pack — lifetime_earned → total_earned (solo en la rama de monedas)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_pack(p_pack_id uuid)
 RETURNS TABLE(out_card_id text, card_name text, card_role text, out_card_number integer, card_tier card_rarity, is_new boolean, copies_after integer, coin_reward integer, pack_type pack_type, coins_earned integer, coins_after integer, was_replay boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id      uuid;
  v_pack         record;
  v_rolled_ids   text[];
  v_card_id      text;
  v_rarity       card_rarity;
  v_is_new       boolean;
  v_total_earned int := 0;
  v_coins_after  int;
  v_album_id     text := 'eterno-diciembre';
  v_replay       boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into v_pack
  from public.packs
  where id = p_pack_id and user_id = v_user_id;

  if not found then
    raise exception 'pack_not_found' using errcode = 'P0001';
  end if;

  if v_pack.expires_at is not null
     and v_pack.expires_at < now()
     and v_pack.status != 'opened' then
    update public.packs set status = 'expired' where id = p_pack_id and status = 'pending';
    raise exception 'pack_expired' using errcode = 'P0001';
  end if;

  if v_pack.status = 'pending' then
    v_rolled_ids := public.roll_cards(v_album_id, v_pack.card_count);

    update public.packs
    set
      status = 'opened',
      rolled_card_ids = v_rolled_ids,
      opened_at = now()
    where id = p_pack_id
      and user_id = v_user_id
      and status = 'pending'
    returning * into v_pack;

    if not found then
      select * into v_pack
      from public.packs
      where id = p_pack_id and user_id = v_user_id;

      if v_pack.status = 'opened' then
        v_replay := true;
        v_rolled_ids := v_pack.rolled_card_ids;
      elsif v_pack.status = 'expired' then
        raise exception 'pack_expired' using errcode = 'P0001';
      else
        raise exception 'pack_not_pending' using errcode = 'P0001';
      end if;
    end if;
  elsif v_pack.status = 'opened' then
    v_replay := true;
    v_rolled_ids := v_pack.rolled_card_ids;
  elsif v_pack.status = 'expired' then
    raise exception 'pack_expired' using errcode = 'P0001';
  else
    raise exception 'pack_not_pending' using errcode = 'P0001';
  end if;

  if not v_replay then
    for v_card_id in select unnest(v_rolled_ids) loop
      select c.rarity into v_rarity from public.cards c where c.id = v_card_id;

      insert into public.user_cards (user_id, card_id, copies, first_obtained_at, last_obtained_at)
      values (v_user_id, v_card_id, 1, now(), now())
      on conflict (user_id, card_id) do update
      set copies = public.user_cards.copies + 1,
          last_obtained_at = now()
      returning (xmax = 0) into v_is_new;

      if not v_is_new then
        v_total_earned := v_total_earned + public._coin_reward_for_rarity(v_rarity);
      end if;
    end loop;

    if v_total_earned > 0 then
      insert into public.user_coins (user_id, balance, total_earned)
      values (v_user_id, v_total_earned, v_total_earned)
      on conflict (user_id) do update
      set balance = public.user_coins.balance + v_total_earned,
          total_earned = public.user_coins.total_earned + v_total_earned,
          updated_at = now()
      returning public.user_coins.balance into v_coins_after;
    else
      select coalesce(uc.balance, 0) into v_coins_after
      from public.user_coins uc where uc.user_id = v_user_id;
      v_coins_after := coalesce(v_coins_after, 0);
    end if;
  else
    select coalesce(uc.balance, 0) into v_coins_after
    from public.user_coins uc where uc.user_id = v_user_id;
    v_coins_after := coalesce(v_coins_after, 0);
  end if;

  return query
  with rolled as (
    select unnest(v_rolled_ids) as cid, generate_subscripts(v_rolled_ids, 1) as ord
  )
  select
    c.id::text                                                     as out_card_id,
    c.name::text                                                   as card_name,
    case
      when coalesce(c.metadata->>'position','') != '' and coalesce(c.metadata->>'club','') != ''
        then (c.metadata->>'position') || ' · ' || (c.metadata->>'club')
      when coalesce(c.metadata->>'position','') != '' then c.metadata->>'position'
      when coalesce(c.metadata->>'club','')     != '' then c.metadata->>'club'
      else ''
    end::text                                                      as card_role,
    c.card_number                                                  as out_card_number,
    c.rarity                                                       as card_tier,
    (uc.copies = 1)                                                as is_new,
    uc.copies                                                      as copies_after,
    (case when uc.copies = 1 then null
          else public._coin_reward_for_rarity(c.rarity) end)::int  as coin_reward,
    v_pack.type                                                    as pack_type,
    v_total_earned                                                 as coins_earned,
    v_coins_after                                                  as coins_after,
    v_replay                                                       as was_replay
  from rolled r
  join public.cards c on c.id = r.cid
  join public.user_cards uc on uc.card_id = c.id and uc.user_id = v_user_id
  order by r.ord;
end;
$function$;


-- -----------------------------------------------------------------------------
-- Data fix: new_5_cards mal tipada (revive el fix de la migración 140000)
-- -----------------------------------------------------------------------------
UPDATE public.mission_templates
SET type = 'collect_rarity'
WHERE id = 'new_5_cards' AND type <> 'collect_rarity';
