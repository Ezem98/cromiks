-- =============================================================================
-- T3: roll_cards — draw ponderado por cromo + filtro de página activa
-- =============================================================================
-- Reemplaza el sorteo "bucket de rareza → cromo de esa rareza" por un draw
-- ponderado POR CROMO sobre el pool activo. Dos cambios de fondo:
--
--  1. FILTRO: solo sortea cromos de páginas con is_active = true (gate de la
--     beta). join cards → pages.
--
--  2. SELECCIÓN: en vez de sortear una rareza y después buscar un cromo de esa
--     rareza (que devolvía NULL y achicaba el sobre si el pool no tenía esa
--     rareza — el bug que matamos), elige directamente un cromo que EXISTE en
--     el pool, ponderado por rareza. Nunca puede devolver null → el sobre
--     siempre trae p_count cromos.
--
-- Pesos por cromo (KNOB ajustable — decisión "rara y especial", 2026-05-30):
--   common 100 · uncommon 60 · rare 25 · epic 15 · legendary 8
-- En el pool chico de la beta (~18 cromos, ~2 legendarias) esto da legendaria
-- ~1.2%/pick (~5%/sobre de 4). Si al mirar testers ves que casi nadie toca una
-- legendaria en la beta, subí el peso de legendary (ej: 8 → 15). Si salen
-- demasiado, bajalo.
--
-- Selección ponderada sin reemplazo dentro de un pick = Efraimidis-Spirakis:
-- key = random()^(1/peso), se toma la key más grande. Peso más alto → key más
-- cerca de 1 → más probable. El loop hace p_count picks independientes (CON
-- reemplazo entre picks: un sobre puede traer la misma figu dos veces, igual
-- que hoy).
--
-- Nota de blast radius: roll_cards la usa open_pack para TODOS los tipos de
-- sobre (daily/mission/referral). Este cambio aplica a todos. En la beta eso
-- está bien (un solo deploy, toda la base es la beta).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.roll_cards(p_album_id text, p_count integer DEFAULT 4)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rolled     text[] := array[]::text[];
  v_card_id    text;
  v_pool_count int;
  i int;
begin
  -- Guard: pool activo no vacío. Sin esto, si ninguna página está activa el
  -- loop devolvería un array vacío en silencio (sobre de 0 cromos). Preferimos
  -- fallar fuerte y visible.
  select count(*) into v_pool_count
  from public.cards c
  join public.pages p on p.id = c.page_id
  where c.album_id = p_album_id
    and p.is_active = true;

  if v_pool_count = 0 then
    raise exception 'no_active_cards' using errcode = 'P0001';
  end if;

  for i in 1..p_count loop
    select c.id into v_card_id
    from public.cards c
    join public.pages p on p.id = c.page_id
    where c.album_id = p_album_id
      and p.is_active = true
    order by power(random(), 1.0 / (case c.rarity
      when 'common'    then 100
      when 'uncommon'  then 60
      when 'rare'      then 25
      when 'epic'      then 15
      when 'legendary' then 8
      else 50
    end)) desc
    limit 1;

    -- v_card_id nunca es null acá (el pool no está vacío y siempre matchea al
    -- menos un cromo), pero el append incondicional es lo que garantiza que el
    -- sobre SIEMPRE traiga p_count cromos.
    v_rolled := array_append(v_rolled, v_card_id);
  end loop;

  return v_rolled;
end;
$function$;
