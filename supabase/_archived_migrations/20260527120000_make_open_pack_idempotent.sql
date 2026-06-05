-- =============================================================================
-- B-22: hacer open_pack idempotente
-- =============================================================================
-- Problema: el Server Component (focus)/open/[packId]/page.tsx puede ejecutar
-- openPack dos veces en una misma navegación (prefetch + render). La segunda
-- corrida ve packs.status='opened' y tira pack_not_pending → user redirigido a
-- /?error=open_failed aunque el sobre esté abierto.
--
-- Solución: SELECT no-lock del pack para decidir branch, UPDATE atómico
-- WHERE status='pending' como barrera de mutación, y replay path que
-- reconstruye la respuesta desde rolled_card_ids ya persistidos.
--
-- Branches:
--   - pack no existe / no es del user  → pack_not_found
--   - pack expired (o expires_at pasó) → pack_expired
--   - pack pending → intentar UPDATE atómico:
--       - UPDATE afecta filas    → primera vez, upsert cartas + coins
--       - UPDATE no afecta filas → otra llamada nos ganó, re-leer y replay
--   - pack opened (caso replay directo) → reconstruir respuesta sin re-mutar
--   - estado desconocido → pack_not_pending (defensivo)
--
-- En el replay path: is_new y coins_earned reflejan estado actual (no del
-- momento de apertura). Aceptamos el tradeoff por MVP: las monedas reales ya
-- se acreditaron en la primera llamada exitosa; el summary del replay puede
-- mostrar "+0 monedas" lo cual es un glitch cosmético raro y no afecta el
-- balance del user.
-- =============================================================================

DROP FUNCTION IF EXISTS public.open_pack(uuid);

CREATE OR REPLACE FUNCTION public.open_pack(p_pack_id uuid)
 RETURNS TABLE(
   out_card_id     text,
   card_name       text,
   card_role       text,
   out_card_number integer,
   card_tier       card_rarity,
   image_url       text,
   is_new          boolean,
   copies_after    integer,
   coin_reward     integer,
   pack_type       pack_type,
   coins_earned    integer,
   coins_after     integer
 )
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

  -- Lectura inicial (sin lock — el UPDATE de abajo es atómico sobre status)
  select * into v_pack
  from public.packs
  where id = p_pack_id and user_id = v_user_id;

  if not found then
    raise exception 'pack_not_found' using errcode = 'P0001';
  end if;

  -- Expiración: chequear antes de intentar abrir o de declarar replay.
  -- Sólo aplica si el pack no fue abierto antes (un pack opened con expires_at
  -- pasado sigue siendo válido para replay — ya está abierto).
  if v_pack.expires_at is not null
     and v_pack.expires_at < now()
     and v_pack.status != 'opened' then
    update public.packs set status = 'expired' where id = p_pack_id and status = 'pending';
    raise exception 'pack_expired' using errcode = 'P0001';
  end if;

  if v_pack.status = 'pending' then
    -- Sortear cromos y UPDATE atómico
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
      -- Race: una llamada concurrente ya abrió el pack entre nuestro SELECT y
      -- el UPDATE. Re-leer estado canonical y caer al replay path.
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
    -- Replay directo: el pack ya estaba abierto desde antes
    v_replay := true;
    v_rolled_ids := v_pack.rolled_card_ids;
  elsif v_pack.status = 'expired' then
    raise exception 'pack_expired' using errcode = 'P0001';
  else
    raise exception 'pack_not_pending' using errcode = 'P0001';
  end if;

  -- Path "primera vez": upsert al inventario y acumular monedas por repetidas
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
      insert into public.user_coins (user_id, balance, lifetime_earned)
      values (v_user_id, v_total_earned, v_total_earned)
      on conflict (user_id) do update
      set balance = public.user_coins.balance + v_total_earned,
          lifetime_earned = public.user_coins.lifetime_earned + v_total_earned,
          updated_at = now()
      returning public.user_coins.balance into v_coins_after;
    else
      select coalesce(uc.balance, 0) into v_coins_after
      from public.user_coins uc where uc.user_id = v_user_id;
      v_coins_after := coalesce(v_coins_after, 0);
    end if;
  else
    -- replay: balance actual, sin cambios
    select coalesce(uc.balance, 0) into v_coins_after
    from public.user_coins uc where uc.user_id = v_user_id;
    v_coins_after := coalesce(v_coins_after, 0);
  end if;

  -- Return query (idéntica a la versión previa). En replay v_total_earned=0
  -- y is_new se calcula sobre el estado actual de user_cards (probablemente
  -- false en todos porque ya se hicieron los upserts en la primera llamada).
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
    (c.metadata->>'number')::int                                   as out_card_number,
    c.rarity                                                       as card_tier,
    (case
      when coalesce(c.content->'photo'->>'source','') in ('','TODO') then null
      else c.content->'photo'->>'source'
    end)::text                                                     as image_url,
    (uc.copies = 1)                                                as is_new,
    uc.copies                                                      as copies_after,
    (case when uc.copies = 1 then null
          else public._coin_reward_for_rarity(c.rarity) end)::int  as coin_reward,
    v_pack.type                                                    as pack_type,
    v_total_earned                                                 as coins_earned,
    v_coins_after                                                  as coins_after
  from rolled r
  join public.cards c on c.id = r.cid
  join public.user_cards uc on uc.card_id = c.id and uc.user_id = v_user_id
  order by r.ord;
end;
$function$;
