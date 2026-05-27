-- =============================================================================
-- Fix: "column reference card_id is ambiguous" en open_pack
-- =============================================================================
--
-- Problema:
--   RETURNS TABLE(card_id text, ..., card_number integer, ...) declara columnas
--   de salida que quedan visibles como variables en todo el cuerpo de la
--   función. En el INSERT ... ON CONFLICT (user_id, card_id), PostgreSQL no
--   puede resolver si `card_id` se refiere a:
--     - La columna real user_cards.card_id (lo deseado)
--     - La output column card_id del RETURNS TABLE (en scope, colisiona)
--   Por eso tira "column reference card_id is ambiguous".
--
-- Solución:
--   Renombrar las output columns que colisionan con columnas reales:
--     - card_id      → out_card_id    (colisiona con user_cards.card_id)
--     - card_number  → out_card_number (colisiona con cards.card_number)
--   El resto de las output columns no colisionan con columnas reales, se
--   mantienen igual para minimizar cambios en el TS.
--
-- Notas:
--   - DROP FUNCTION primero porque cambiar nombres del RETURNS TABLE cambia el
--     row type, y Postgres no permite hacerlo con CREATE OR REPLACE
--     ("cannot change return type of existing function").
--   - Toda la lógica interna se mantiene idéntica a la versión previa.
--   - El TypeScript de src/features/pack-opening/actions.ts se actualiza en
--     paralelo a este SQL para leer los nuevos nombres de output.
--   - Después de aplicar, conviene correr `pnpm db:types` para regenerar
--     src/types/database.types.ts con los nombres nuevos.
-- =============================================================================

-- Necesario porque cambiamos el row type del RETURNS TABLE
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Lock del pack
  select * into v_pack
  from public.packs
  where id = p_pack_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'pack_not_found' using errcode = 'P0001';
  end if;

  if v_pack.status != 'pending' then
    raise exception 'pack_not_pending' using errcode = 'P0001';
  end if;

  if v_pack.expires_at is not null and v_pack.expires_at < now() then
    update public.packs set status = 'expired' where id = p_pack_id;
    raise exception 'pack_expired' using errcode = 'P0001';
  end if;

  -- Sortear cromos
  v_rolled_ids := public.roll_cards(v_album_id, v_pack.card_count);

  -- Marcar pack como abierto
  update public.packs
  set
    status = 'opened',
    rolled_card_ids = v_rolled_ids,
    opened_at = now()
  where id = p_pack_id;

  -- Upsert al inventario y acumular monedas por repetidas
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

  -- Actualizar balance de monedas (si ganó algo por repetidas)
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

  -- Return query con todos los campos. Output columns renombrados con prefijo
  -- out_ para evitar colisión con columnas reales (card_id, card_number).
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
