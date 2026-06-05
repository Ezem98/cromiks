-- =============================================================================
-- Snapshot de pin_card y unpin_card
-- =============================================================================
-- Estas RPCs estaban creadas vía Supabase Studio sin versionar. Capturadas
-- con `pg_get_functiondef`. A partir de acá quedan en migrations. Sin
-- cambios funcionales.
--
-- Codes que tiran (relevante para mapping en src/features/album/actions.ts):
--   - pin_card:   'auth_required', 'card_not_owned'
--   - unpin_card: 'auth_required' (el UPDATE es silently no-op si el user no
--                 tiene la carta — no tira error)
-- =============================================================================

DROP FUNCTION IF EXISTS public.pin_card(text);

CREATE OR REPLACE FUNCTION public.pin_card(p_card_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  update public.user_cards
  set is_pinned = true
  where user_id = v_user_id and card_id = p_card_id;

  if not found then
    raise exception 'card_not_owned' using errcode = 'P0001';
  end if;
end;
$function$;


DROP FUNCTION IF EXISTS public.unpin_card(text);

CREATE OR REPLACE FUNCTION public.unpin_card(p_card_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  update public.user_cards
  set is_pinned = false
  where user_id = v_user_id and card_id = p_card_id;
end;
$function$;
