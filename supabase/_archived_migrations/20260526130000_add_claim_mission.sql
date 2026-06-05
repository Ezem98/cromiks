-- =============================================================================
-- claim_mission — reclama el reward de una user_mission completed
-- =============================================================================
--
-- Hace:
--   1. Valida que el user es dueño de la misión
--   2. Valida que la misión está en status 'completed' (no claimed, no expired)
--   3. Aplica los rewards según el template:
--      - reward_coins → suma a user_coins.balance
--      - reward_pack_type → crea un pack pendiente con reward_card_count
--   4. Marca user_missions.status = 'claimed' + claimed_at = now()
--   5. Devuelve los rewards aplicados para feedback en UI
--
-- Output columns con prefijo `out_` para evitar colisión con columnas reales
-- (mismo patrón que en open_pack).
--
-- Errores:
--   - auth_required        : no hay user logueado
--   - mission_not_found    : misión no existe o no es del user
--   - mission_not_completed: la misión todavía está active, expired, o claimed
--   - template_not_found   : el template referenciado no existe (corrupted data)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_mission(p_user_mission_id uuid)
 RETURNS TABLE(
   out_coins_earned  integer,
   out_pack_id       uuid,
   out_cards_earned  integer,
   out_new_balance   integer
 )
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
    insert into public.user_coins (user_id, balance, lifetime_earned)
    values (v_user_id, v_template.reward_coins, v_template.reward_coins)
    on conflict (user_id) do update
    set balance         = public.user_coins.balance + v_template.reward_coins,
        lifetime_earned = public.user_coins.lifetime_earned + v_template.reward_coins,
        updated_at      = now()
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

-- Grant para que authenticated users puedan llamar la función
GRANT EXECUTE ON FUNCTION public.claim_mission(uuid) TO authenticated;
