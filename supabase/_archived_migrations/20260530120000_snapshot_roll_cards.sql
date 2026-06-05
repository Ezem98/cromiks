-- =============================================================================
-- Snapshot de roll_cards (T1 del plan curated-beta-pool)
-- =============================================================================
-- roll_cards vivía SOLO en Supabase Studio, sin versionar (igual que el caso de
-- claim_daily_pack / dismantle_card en 20260527100000). Antes de tocarla para la
-- beta (restringir el pool a la página activa + draw ponderado por cromo), la
-- versionamos verbatim para tener diff y rollback.
--
-- SIN cambios funcionales en este archivo. El cuerpo es el output exacto de
-- pg_get_functiondef('public.roll_cards') del proyecto remoto al 2026-05-30.
--
-- Comportamiento actual (a tener en cuenta para la migration que sigue):
--   - Sortea rareza por umbrales fijos: common .55 / uncommon .27 / rare .07 /
--     epic .06 / legendary .05.
--   - Después elige un cromo de esa rareza al azar dentro del album.
--   - BUG latente: si la rareza sorteada no tiene ningún cromo en el pool, el
--     `if v_card_id is not null` SALTEA el append → el sobre devuelve menos
--     cromos de los pedidos. Esto explota cuando restringimos a una sola página
--     (que no tiene las 5 rarezas). Lo arregla la migration siguiente con un
--     draw ponderado por cromo (no por bucket de rareza).
-- =============================================================================

DROP FUNCTION IF EXISTS public.roll_cards(text, integer);

CREATE OR REPLACE FUNCTION public.roll_cards(p_album_id text, p_count integer DEFAULT 4)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rolled text[] := array[]::text[];
  v_rarity card_rarity;
  v_card_id text;
  v_roll numeric;
  i int;
begin
  for i in 1..p_count loop
    -- Roll de rareza
    v_roll := random();

    if v_roll < 0.55 then
      v_rarity := 'common';
    elsif v_roll < 0.82 then           -- 0.55 + 0.27
      v_rarity := 'uncommon';
    elsif v_roll < 0.89 then           -- 0.82 + 0.07
      v_rarity := 'rare';
    elsif v_roll < 0.95 then           -- 0.89 + 0.06
      v_rarity := 'epic';
    else                                -- 0.95 + 0.05
      v_rarity := 'legendary';
    end if;

    -- Sortear un cromo de esa rareza al azar
    select id into v_card_id
    from public.cards
    where album_id = p_album_id
      and rarity = v_rarity
    order by random()
    limit 1;

    if v_card_id is not null then
      v_rolled := array_append(v_rolled, v_card_id);
    end if;
  end loop;

  return v_rolled;
end;
$function$;
